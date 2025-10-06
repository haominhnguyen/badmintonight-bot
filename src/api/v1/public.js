const express = require('express');
const router = express.Router();
const db = require('../../db');

/**
 * @swagger
 * /api/v1/public/sessions:
 *   get:
 *     summary: Get all sessions (public)
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of sessions per page
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 */
router.get('/sessions', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const sessions = await db.prisma.session.findMany({
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            votes: true,
            proxyVotes: true,
            payments: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/v1/public/sessions/{id}:
 *   get:
 *     summary: Get session by ID (public)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *       404:
 *         description: Session not found
 */
router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    const session = await db.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                gender: true
              }
            }
          }
        },
        proxyVotes: {
          include: {
            voter: {
              select: {
                id: true,
                name: true,
                gender: true
              }
            },
            targetUser: {
              select: {
                id: true,
                name: true,
                gender: true
              }
            }
          }
        },
        payments: true,
        _count: {
          select: {
            votes: true,
            proxyVotes: true,
            payments: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/v1/public/statistics/overview:
 *   get:
 *     summary: Get overview statistics (public)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/statistics/overview', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Session stats
    const totalSessions = await db.prisma.session.count();
    const completedSessions = await db.prisma.session.count({
      where: { status: 'completed' }
    });
    const pendingSessions = await db.prisma.session.count({
      where: { status: 'pending' }
    });

    // Recent sessions (30 days)
    const recentSessions = await db.prisma.session.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        _count: {
          select: {
            votes: true,
            payments: true
          }
        }
      }
    });

    // Payment stats
    const totalPayments = await db.prisma.payment.count();
    const paidPayments = await db.prisma.payment.count({
      where: { paid: true }
    });

    const totalRevenue = await db.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { paid: true }
    });

    const totalOutstanding = await db.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { paid: false }
    });

    // User stats
    const totalUsers = await db.prisma.user.count();
    const maleUsers = await db.prisma.user.count({
      where: { gender: 'male' }
    });
    const femaleUsers = await db.prisma.user.count({
      where: { gender: 'female' }
    });

    // Top participants (30 days)
    const topParticipants = await db.prisma.vote.groupBy({
      by: ['userId'],
      where: {
        voteType: 'VOTE_YES',
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: 10
    });

    // Enrich top participants with user data
    const enrichedTopParticipants = await Promise.all(
      topParticipants.map(async (p) => {
        const user = await db.prisma.user.findUnique({
          where: { id: p.userId },
          select: { id: true, name: true, gender: true }
        });
        return {
          user,
          participationCount: p._count
        };
      })
    );

    res.json({
      success: true,
      data: {
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          pending: pendingSessions,
          recent: recentSessions.length
        },
        payments: {
          total: totalPayments,
          paid: paidPayments,
          unpaid: totalPayments - paidPayments,
          totalRevenue: totalRevenue._sum.amount || 0,
          totalOutstanding: totalOutstanding._sum.amount || 0,
          collectionRate: (() => {
            const totalAmount = (totalRevenue._sum.amount || 0) + (totalOutstanding._sum.amount || 0);
            return totalAmount > 0 
              ? ((totalRevenue._sum.amount || 0) / totalAmount * 100).toFixed(1) 
              : 0;
          })()
        },
        users: {
          total: totalUsers,
          male: maleUsers,
          female: femaleUsers
        },
        topParticipants: enrichedTopParticipants
      }
    });
  } catch (error) {
    console.error('Error fetching overview statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/v1/public/payments/user-payments:
 *   get:
 *     summary: Get user payments (public)
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: User payments retrieved successfully
 */
router.get('/payments/user-payments', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    // Get all users
    const users = await db.prisma.user.findMany({
      take: parseInt(limit),
      orderBy: {
        name: 'asc'
      }
    });

    // Get all payments with session info
    const allPayments = await db.prisma.payment.findMany({
      include: {
        session: {
          select: {
            id: true,
            playDate: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group payments by user
    const paymentsByUser = {};
    allPayments.forEach(payment => {
      if (!paymentsByUser[payment.userId]) {
        paymentsByUser[payment.userId] = [];
      }
      paymentsByUser[payment.userId].push(payment);
    });

    // Transform data to match frontend expectations
    const userPayments = users.map(user => {
      const payments = (paymentsByUser[user.id] || []).map(payment => ({
        id: payment.id,
        amount: payment.amount,
        paid: payment.paid,
        paidAt: payment.paidAt,
        sessionDate: payment.session.playDate,
        sessionId: payment.session.id
      }));

      const paidCount = payments.filter(p => p.paid).length;
      const unpaidCount = payments.filter(p => !p.paid).length;
      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const paidAmount = payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
      const unpaidAmount = totalAmount - paidAmount;

      return {
        userId: user.id,
        userName: user.name,
        gender: user.gender,
        payments,
        paidCount,
        unpaidCount,
        totalAmount,
        paidAmount,
        unpaidAmount
      };
    });

    res.json({
      success: true,
      data: userPayments
    });
  } catch (error) {
    console.error('Error fetching user payments:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/v1/public/admin/sessions:
 *   get:
 *     summary: Get admin sessions (public)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 */
router.get('/admin/sessions', async (req, res) => {
  try {
    const sessions = await db.prisma.session.findMany({
      where: { status: 'pending' },
      orderBy: { playDate: 'desc' },
      select: {
        id: true,
        playDate: true,
        status: true,
        courtCount: true,
        shuttleCount: true,
        totalCost: true,
        _count: {
          select: {
            votes: true,
            proxyVotes: true,
            payments: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching admin sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/v1/public/admin/payment-summary:
 *   get:
 *     summary: Get payment summary (public)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Payment summary retrieved successfully
 */
router.get('/admin/payment-summary', async (req, res) => {
  try {
    const session = await db.prisma.session.findFirst({
      where: { status: 'pending' },
      orderBy: { playDate: 'desc' }
    });

    if (!session) {
      return res.json({
        success: false,
        message: 'Chưa có session hôm nay'
      });
    }

    const payments = await db.prisma.payment.findMany({
      where: { sessionId: session.id },
      orderBy: { userName: 'asc' }
    });

    const paidCount = payments.filter(p => p.paid).length;
    const unpaidCount = payments.filter(p => !p.paid).length;
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    const unpaidAmount = payments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0);

    const unpaidUsers = payments.filter(p => !p.paid).map(p => ({
      id: p.id,
      userName: p.userName,
      amount: p.amount
    }));

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          playDate: session.playDate,
          status: session.status,
          totalCost: session.totalCost
        },
        summary: {
          totalUsers: payments.length,
          paidCount,
          unpaidCount,
          totalAmount,
          paidAmount,
          unpaidAmount,
          completionRate: payments.length > 0 ? (paidCount / payments.length * 100).toFixed(1) : 0
        },
        unpaidUsers
      }
    });
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
