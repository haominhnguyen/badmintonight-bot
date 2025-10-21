const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Badminton Bot API',
      version: '1.0.0',
      description: 'Professional API for Badminton Bot - Money Management System',
      contact: {
        name: 'API Support',
        email: 'support@badmintonbot.com',
        url: 'https://badmintonbot.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3101',
        description: 'Development server'
      },
      {
        url: 'https://api.badmintonbot.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for service-to-service communication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object'
            },
            message: {
              type: 'string',
              example: 'Success message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        Session: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            playDate: {
              type: 'string',
              format: 'date',
              example: '2024-01-01'
            },
            courtCount: {
              type: 'integer',
              example: 2
            },
            shuttleCount: {
              type: 'integer',
              example: 3
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'cancelled'],
              example: 'pending'
            },
            totalCost: {
              type: 'number',
              example: 240000
            },
            participantCount: {
              type: 'integer',
              example: 8
            },
            proxyVoteCount: {
              type: 'integer',
              example: 2
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            sessionId: {
              type: 'integer',
              example: 1
            },
            userId: {
              type: 'integer',
              example: 1
            },
            userName: {
              type: 'string',
              example: 'John Doe'
            },
            amount: {
              type: 'number',
              example: 40000
            },
            paid: {
              type: 'boolean',
              example: false
            },
            paidAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female'],
              example: 'male'
            },
            facebookId: {
              type: 'string',
              example: '1234567890'
            },
            isAdmin: {
              type: 'boolean',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            password: {
              type: 'string',
              minLength: 4,
              maxLength: 50,
              example: '12345'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                expiresIn: {
                  type: 'string',
                  example: '24h'
                },
                user: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      example: 'admin'
                    },
                    role: {
                      type: 'string',
                      example: 'admin'
                    }
                  }
                }
              }
            }
          }
        },
        CreateSessionRequest: {
          type: 'object',
          required: ['date'],
          properties: {
            date: {
              type: 'string',
              format: 'date',
              example: '2024-01-01'
            }
          }
        },
        SetCourtRequest: {
          type: 'object',
          required: ['count'],
          properties: {
            count: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              example: 2
            },
            sessionId: {
              type: 'integer',
              example: 1
            }
          }
        },
        SetShuttleRequest: {
          type: 'object',
          required: ['count'],
          properties: {
            count: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              example: 3
            },
            sessionId: {
              type: 'integer',
              example: 1
            }
          }
        },
        MarkPaidRequest: {
          type: 'object',
          required: ['userName'],
          properties: {
            userName: {
              type: 'string',
              example: 'John Doe'
            }
          }
        },
        StatisticsOverview: {
          type: 'object',
          properties: {
            totalSessions: {
              type: 'integer',
              example: 25
            },
            totalParticipants: {
              type: 'integer',
              example: 150
            },
            totalRevenue: {
              type: 'number',
              example: 6000000
            },
            averageSessionSize: {
              type: 'number',
              example: 6.5
            },
            sessionsThisMonth: {
              type: 'integer',
              example: 8
            },
            participantsThisMonth: {
              type: 'integer',
              example: 48
            },
            revenueThisMonth: {
              type: 'number',
              example: 1200000
            },
            paymentCompletionRate: {
              type: 'number',
              example: 95.5
            },
            totalPaid: {
              type: 'number',
              example: 5700000
            },
            totalUnpaid: {
              type: 'number',
              example: 300000
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Access token required',
                code: 'UNAUTHORIZED',
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Admin access required',
                code: 'FORBIDDEN',
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Session not found',
                code: 'NOT_FOUND',
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Validation failed',
                errors: [
                  {
                    field: 'count',
                    message: 'Count must be between 1 and 10',
                    value: 15
                  }
                ],
                code: 'VALIDATION_ERROR',
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Too many requests from this IP, please try again later',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: '15 minutes',
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Internal server error',
                code: 'INTERNAL_ERROR',
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            password: {
              type: 'string',
              description: 'Admin password'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                expiresIn: { type: 'string' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    role: { type: 'string' }
                  }
                }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        CreateSessionRequest: {
          type: 'object',
          required: ['date'],
          properties: {
            date: {
              type: 'string',
              description: 'Session date (YYYY-MM-DD, "today", or "tomorrow")'
            },
            name: {
              type: 'string',
              description: 'Session name (optional)'
            },
            courtCount: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              description: 'Number of courts (optional, default: 3)'
            }
          }
        },
        SetCourtRequest: {
          type: 'object',
          required: ['count'],
          properties: {
            count: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              description: 'Number of courts'
            }
          }
        },
        SetShuttleRequest: {
          type: 'object',
          required: ['count'],
          properties: {
            count: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              description: 'Number of shuttlecocks'
            }
          }
        },
        StatisticsOverview: {
          type: 'object',
          properties: {
            totalSessions: { type: 'integer' },
            totalParticipants: { type: 'integer' },
            totalRevenue: { type: 'number' },
            averageSessionSize: { type: 'number' },
            sessionsThisMonth: { type: 'integer' },
            participantsThisMonth: { type: 'integer' },
            revenueThisMonth: { type: 'number' },
            paymentCompletionRate: { type: 'number' },
            totalPaid: { type: 'number' },
            totalUnpaid: { type: 'number' }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and authorization endpoints'
      },
      {
        name: 'Sessions',
        description: 'Session management operations'
      },
      {
        name: 'Admin',
        description: 'Administrative operations (requires admin access)'
      },
      {
        name: 'Payments',
        description: 'Payment management operations'
      },
      {
        name: 'Statistics',
        description: 'Statistics and analytics endpoints'
      },
      {
        name: 'Health',
        description: 'Health check and system status'
      },
      {
        name: 'Cron',
        description: 'Cron job management and automation'
      },
      {
        name: 'Public',
        description: 'Public endpoints (no authentication required)'
      },
      {
        name: 'System',
        description: 'System information and version endpoints'
      }
    ]
  },
  apis: [
    './src/api.js', 
    './src/api-server.js',
    './src/api/v1/auth.js',
    './src/api/v1/sessions.js',
    './src/api/v1/admin.js',
    './src/api/v1/payments.js',
    './src/api/v1/statistics.js',
    './src/api/v1/health.js',
    './src/api/v1/cron.js',
    './src/api/v1/public.js',
    './src/api/v1/version.js',
    './src/api/v1/index.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
