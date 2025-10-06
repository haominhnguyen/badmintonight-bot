const express = require('express');
const router = express.Router();
const { 
  authenticateToken, 
  logSecurityEvent 
} = require('../../middleware/auth');
const db = require('../../db');

/**
 * @swagger
 * /api/v1/statistics/overview:
 *   get:
 *     summary: Get overview statistics
 *     tags: [Statistics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StatisticsOverview'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    // Get total sessions
    const totalSessions = await db.prisma.session.count();
    
    // Get sessions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const sessionsThisMonth = await db.prisma.session.count({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      }
    });

    // Get total participants
    const totalParticipants = await db.prisma.vote.count({
      distinct: ['userId']
    });

    // Get participants this month
    const participantsThisMonth = await db.prisma.vote.count({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      },
      distinct: ['userId']
    });

    // Get total revenue
    const totalRevenueResult = await db.prisma.session.aggregate({
      _sum: {
        totalCost: true
      }
    });
    const totalRevenue = totalRevenueResult._sum.totalCost || 0;

    // Get revenue this month
    const revenueThisMonthResult = await db.prisma.session.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      },
      _sum: {
        totalCost: true
      }
    });
    const revenueThisMonth = revenueThisMonthResult._sum.totalCost || 0;

    // Get payment statistics
    const paymentStats = await db.prisma.payment.aggregate({
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    const paidPayments = await db.prisma.payment.aggregate({
      where: {
        paid: true
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    const totalPaid = paidPayments._sum.amount || 0;
    const totalUnpaid = (paymentStats._sum.amount || 0) - totalPaid;
    const paymentCompletionRate = paymentStats._count.id > 0 ? 
      ((paidPayments._count.id / paymentStats._count.id) * 100).toFixed(1) : 0;

    // Calculate average session size
    const sessionsWithParticipants = await db.prisma.session.findMany({
      include: {
        _count: {
          select: {
            votes: true,
            proxyVotes: true
          }
        }
      }
    });

    const totalParticipantsInSessions = sessionsWithParticipants.reduce((sum, session) => {
      return sum + session._count.votes + session._count.proxyVotes;
    }, 0);

    const averageSessionSize = totalSessions > 0 ? 
      (totalParticipantsInSessions / totalSessions).toFixed(1) : 0;

    const statistics = {
      totalSessions,
      totalParticipants,
      totalRevenue,
      averageSessionSize: parseFloat(averageSessionSize),
      sessionsThisMonth,
      participantsThisMonth,
      revenueThisMonth,
      paymentCompletionRate: parseFloat(paymentCompletionRate),
      totalPaid,
      totalUnpaid
    };

    res.json({
      success: true,
      data: statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get statistics error:', error);
    logSecurityEvent('GET_STATISTICS_ERROR', req, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/statistics/overview:
 *   get:
 *     summary: Get detailed overview statistics
 *     tags: [Statistics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed statistics retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/overview', authenticateToken, async (req, res) => {
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
          collectionRate: totalPayments > 0 
            ? (paidPayments / totalPayments * 100).toFixed(1) 
            : 0
        },
        users: {
          total: totalUsers,
          male: maleUsers,
          female: femaleUsers
        },
        topParticipants: enrichedTopParticipants
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in GET /api/v1/statistics/overview:', error);
    logSecurityEvent('GET_OVERVIEW_STATISTICS_ERROR', req, { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
