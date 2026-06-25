import { Client } from 'pg'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// Configuration
// ============================================================================

const AURORA_CONFIG = {
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: 5432,
}

const DYNAMODB_CONFIG = {
  region: process.env.AWS_REGION,
  roleArn: process.env.AWS_ROLE_ARN,
}

// ============================================================================
// Aurora PostgreSQL Seed Data
// ============================================================================

interface User {
  name: string
  email: string
  role: 'admin' | 'attorney' | 'paralegal' | 'clerk' | 'client'
}

interface Case {
  title: string
  description: string
  category: string
  status: 'pending' | 'active' | 'closed'
  priority: 'low' | 'medium' | 'high'
  assigned_to: number | null
}

const mockUsers: User[] = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@nexuscase.law',
    role: 'admin',
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@nexuscase.law',
    role: 'attorney',
  },
  {
    name: 'Emma Robinson',
    email: 'emma.robinson@nexuscase.law',
    role: 'paralegal',
  },
]

const mockCases: (caseData: { assigned_to: number | null }) => Case[] = (
  userData,
) => [
  {
    title: 'Contract Dispute - Tech Licensing Agreement',
    description:
      'Dispute regarding software licensing terms and usage rights between TechCorp Solutions and Enterprise Software Ltd.',
    category: 'Commercial Law',
    status: 'active',
    priority: 'high',
    assigned_to: userData.assigned_to,
  },
  {
    title: 'Employment Termination - Wrongful Dismissal Claim',
    description:
      'Former employee claims wrongful termination alleging discrimination based on age and family status.',
    category: 'Employment Law',
    status: 'active',
    priority: 'high',
    assigned_to: userData.assigned_to,
  },
  {
    title: 'Intellectual Property - Patent Infringement',
    description:
      'Patent infringement claim against competitor regarding AI processing algorithms. Under review for validity and damages assessment.',
    category: 'Intellectual Property',
    status: 'pending',
    priority: 'medium',
    assigned_to: null,
  },
  {
    title: 'Real Estate - Commercial Lease Dispute',
    description:
      'Dispute over commercial lease terms and maintenance responsibilities. Case resolved through mediation.',
    category: 'Real Estate',
    status: 'closed',
    priority: 'low',
    assigned_to: null,
  },
  {
    title: 'Regulatory Compliance - Data Privacy Violation',
    description:
      'Investigation into potential GDPR violations and customer data mishandling. Regulatory agency audit in progress.',
    category: 'Regulatory Compliance',
    status: 'active',
    priority: 'high',
    assigned_to: userData.assigned_to,
  },
]

// ============================================================================
// DynamoDB Chat Messages
// ============================================================================

interface ChatMessage {
  chatId: string
  timestamp: string
  caseId: string
  sender: 'user' | 'gemini'
  message: string
}

const generateMockChatMessages = (caseId: string): ChatMessage[] => {
  const baseTime = new Date('2024-06-25T10:00:00Z')
  const messages: ChatMessage[] = []

  const exchanges = [
    {
      user: 'Can you summarize the key points from the contract dispute case?',
      gemini:
        "I've analyzed the contract dispute case. Key points:\n1. **Parties**: TechCorp Solutions Inc. vs Enterprise Software Ltd.\n2. **Dispute**: Scope of software licensing deployment rights\n3. **Status**: Currently in negotiation phase\n4. **Key Issue**: Whether cloud deployment is included in the license scope\n5. **Timeline**: Case opened January 15, 2024",
    },
    {
      user: 'What are the potential risks for our client?',
      gemini:
        'Based on the documentation, I identify these risks:\n- **Contractual ambiguity**: Language could be interpreted two ways\n- **Financial exposure**: Potential damages estimated at $500K-$1M\n- **Timeline risk**: Litigation could extend 18-24 months\n- **Reputational impact**: Industry implications if verdict is unfavorable\n\nRecommendation: Pursue early settlement negotiation or clarify ambiguity through amending clause.',
    },
    {
      user: 'Extract all dates and deadlines from the case documents.',
      gemini:
        'Extracted timeline:\n- **Jan 15, 2024**: Case initiated\n- **Feb 10, 2024**: Amendment proposal submitted\n- **Mar 5, 2024**: Email evidence collected\n- **Jun 20, 2024**: Last modification\n- **Jul 15, 2024**: Discovery deadline (projected)\n- **Sep 30, 2024**: Trial date (pending confirmation)',
    },
    {
      user: 'Create a compliance checklist for this case.',
      gemini:
        'Compliance Checklist Generated:\n✓ Document preservation procedures - COMPLETE\n✓ Conflict of interest review - COMPLETE\n☐ Expert witness retention - PENDING\n☐ Deposition scheduling - IN PROGRESS\n☐ Court filing requirements - PENDING\n☐ Regulatory notifications - PENDING\n\n3 of 6 items completed. Estimated completion: July 10, 2024',
    },
    {
      user: 'What documents are missing from the file?',
      gemini:
        'Missing documentation identified:\n1. **Expert witness reports** - Required for damages claim\n2. **Deposition transcripts** - Need opposing counsel statements\n3. **Communication logs** - Email chains post-dispute\n4. **Prior version records** - Historical agreement versions\n5. **Board minutes** - Internal authorization records\n\nPriority: High - These are critical for trial preparation.',
    },
  ]

  let messageIndex = 0
  for (const exchange of exchanges) {
    messages.push({
      chatId: uuidv4(),
      timestamp: new Date(baseTime.getTime() + messageIndex * 5 * 60000)
        .toISOString(),
      caseId,
      sender: 'user',
      message: exchange.user,
    })
    messageIndex++

    messages.push({
      chatId: uuidv4(),
      timestamp: new Date(baseTime.getTime() + messageIndex * 5 * 60000)
        .toISOString(),
      caseId,
      sender: 'gemini',
      message: exchange.gemini,
    })
    messageIndex++
  }

  return messages
}

// ============================================================================
// Seed Functions
// ============================================================================

async function seedAurora(): Promise<number> {
  const client = new Client(AURORA_CONFIG)

  try {
    console.log('[v0] Connecting to Aurora PostgreSQL...')
    await client.connect()

    console.log('[v0] Checking if data already exists...')
    const userCheck = await client.query('SELECT COUNT(*) FROM users')
    if (parseInt(userCheck.rows[0].count) > 0) {
      console.log('[v0] Aurora already seeded. Skipping user creation.')
      const caseCheck = await client.query('SELECT COUNT(*) FROM cases')
      if (parseInt(caseCheck.rows[0].count) > 0) {
        console.log('[v0] Aurora cases already exist. Skipping.')
        const firstCase = await client.query(
          'SELECT id FROM cases LIMIT 1',
        )
        await client.end()
        return firstCase.rows[0]?.id || 1
      }
    }

    console.log('[v0] Seeding Aurora with users...')
    const userIds: number[] = []

    for (const user of mockUsers) {
      const result = await client.query(
        `INSERT INTO users (name, email, role) 
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [user.name, user.email, user.role],
      )
      if (result.rows.length > 0) {
        userIds.push(result.rows[0].id)
        console.log(`[v0] Created user: ${user.name}`)
      }
    }

    console.log('[v0] Seeding Aurora with cases...')
    let firstCaseId: number | null = null

    // Use first or second user as assigned_to
    const assignedUserId = userIds[1] || userIds[0]
    const casesData = mockCases({ assigned_to: assignedUserId })

    for (let i = 0; i < casesData.length; i++) {
      const caseData = casesData[i]
      const result = await client.query(
        `INSERT INTO cases (title, description, category, status, priority, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          caseData.title,
          caseData.description,
          caseData.category,
          caseData.status,
          caseData.priority,
          caseData.assigned_to,
        ],
      )

      const caseId = result.rows[0].id
      if (i === 0) firstCaseId = caseId
      console.log(`[v0] Created case: ${caseData.title} (ID: ${caseId})`)
    }

    console.log('[v0] Aurora seeding complete!')
    await client.end()

    return firstCaseId || 1
  } catch (error) {
    console.error('[v0] Aurora seeding error:', error)
    await client.end()
    throw error
  }
}

async function seedDynamoDB(caseId: number | string): Promise<void> {
  try {
    if (!DYNAMODB_CONFIG.region || !DYNAMODB_CONFIG.roleArn) {
      throw new Error(
        'Missing AWS_REGION or AWS_ROLE_ARN environment variables',
      )
    }

    console.log('[v0] Connecting to DynamoDB...')

    const dynamoClient = new DynamoDBClient({
      region: DYNAMODB_CONFIG.region,
      credentials: awsCredentialsProvider({
        roleArn: DYNAMODB_CONFIG.roleArn,
        clientConfig: { region: DYNAMODB_CONFIG.region },
      }),
    })

    const docClient = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    })

    console.log('[v0] Generating mock chat messages...')
    const messages = generateMockChatMessages(String(caseId))

    // Batch write in chunks of 25 (DynamoDB limit)
    const chunkSize = 25
    const tableName = process.env.DYNAMODB_TABLE_NAME

    if (!tableName) {
      throw new Error('Missing DYNAMODB_TABLE_NAME environment variable')
    }

    console.log(`[v0] Writing ${messages.length} messages to DynamoDB...`)

    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize)
      const requestItems = chunk.map((msg) => ({
        PutRequest: {
          Item: msg,
        },
      }))

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: requestItems,
          },
        }),
      )

      console.log(
        `[v0] Batch ${Math.floor(i / chunkSize) + 1} written (${Math.min(i + chunkSize, messages.length)}/${messages.length} messages)`,
      )
    }

    console.log('[v0] DynamoDB seeding complete!')
  } catch (error) {
    console.error('[v0] DynamoDB seeding error:', error)
    throw error
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log('[v0] Starting database seeding...\n')

  try {
    const firstCaseId = await seedAurora()
    await seedDynamoDB(firstCaseId)
    console.log('\n[v0] ✓ All databases seeded successfully!')
  } catch (error) {
    console.error('\n[v0] ✗ Seeding failed:', error)
    process.exit(1)
  }
}

main()
