const db = require('./db');

/**
 * Tính toán chi phí cho một session cầu lông
 * @param {number} sessionId - ID của session
 * @returns {Object} Kết quả tính toán chi phí
 */
async function computeSession(sessionId) {
  try {
    const session = await db.prisma.session.findUnique({
      where: { id: sessionId },
      include: { 
        votes: { 
          include: { user: true } 
        },
        proxyVotes: {
          include: {
            targetUser: true,
            voter: true
          }
        }
      }
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Đếm số lượng nam và nữ tham gia (đi chơi)
    let males = 0, females = 0;
    let malesNotGoing = 0, femalesNotGoing = 0;
    let courtCount = session.courtCount;
    let shuttleCount = session.shuttleCount;

    // Xử lý các vote thường
    session.votes.forEach(vote => {
      if (vote.voteType === "VOTE_YES") {
        if (vote.user.gender === "female") {
          females++;
        } else {
          males++;
        }
      } else if (vote.voteType === "VOTE_NO") {
        if (vote.user.gender === "female") {
          femalesNotGoing++;
        } else {
          malesNotGoing++;
        }
      } else if (vote.voteType === "COURT") {
        courtCount++;
      } else if (vote.voteType === "SHUTTLE") {
        shuttleCount++;
      }
    });

    // Xử lý các vote hộ
    session.proxyVotes.forEach(proxyVote => {
      if (proxyVote.voteType === "VOTE_YES") {
        if (proxyVote.targetUser.gender === "female") {
          females++;
        } else {
          males++;
        }
      } else if (proxyVote.voteType === "VOTE_NO") {
        if (proxyVote.targetUser.gender === "female") {
          femalesNotGoing++;
        } else {
          malesNotGoing++;
        }
      }
    });

    // Lấy giá từ environment variables
    const courtPrice = parseInt(process.env.COURT_PRICE) || 120000; // Default: 120k per court
    const shuttlePrice = parseInt(process.env.SHUTTLE_PRICE) || 25000; // Default: 25k per shuttle
    const femalePrice = parseInt(process.env.FEMALE_PRICE) || 40000; // Default: 40k fixed for females
    
    // Tính tổng chi phí
    const courtTotal = courtCount * courtPrice;
    const shuttleTotal = shuttleCount * shuttlePrice;
    const total = courtTotal + shuttleTotal;
    
    // Tính số người chia tiền
    const totalGoing = males + females; // Người đi chơi (chia cả sân + cầu)
    const totalNotGoing = malesNotGoing + femalesNotGoing; // Người không đi (chỉ chia sân)
    const totalCourtSharing = totalGoing + totalNotGoing; // Tổng người chia tiền sân
    const totalShuttleSharing = totalGoing; // Chỉ người đi mới chia tiền cầu
    
    // Tính chi phí cho nữ (cố định theo FEMALE_PRICE)
    const femaleTotal = females * femalePrice;

    let maleShare = 0;
    let femaleShare = femalePrice;
    let maleNotGoingShare = 0;
    let femaleNotGoingShare = 0;

    // Logic chia tiền
    if (totalGoing > 0) {
      // Có người đi: tính chia tiền
      if (males > 0) {
        // Có nam đi: nam chia phần còn lại của tiền cầu + sân
        const remainingForMales = (courtTotal + shuttleTotal - femaleTotal);
        maleShare = Math.ceil(remainingForMales / males / 1000) * 1000;
      } else {
        // Không có nam đi: nữ chia đều cả sân + cầu
        const perPerson = Math.ceil((courtTotal + shuttleTotal) / totalGoing / 1000) * 1000;
        maleShare = perPerson;
        femaleShare = perPerson;
      }
    }

    // Người không đi chỉ chia tiền sân
    if (totalNotGoing > 0) {
      const courtSharePerPerson = Math.ceil(courtTotal / totalCourtSharing / 1000) * 1000;
      maleNotGoingShare = courtSharePerPerson;
      femaleNotGoingShare = courtSharePerPerson;
    }

    // Tạo danh sách participants cho payment
    // Sử dụng Map để gộp tiền theo userId (một người vote hộ nhiều người)
    const participantMap = new Map();
    
    // Thêm người đi chơi
    session.votes
      .filter(v => v.voteType === 'VOTE_YES')
      .forEach(vote => {
        const amount = vote.user.gender === 'female' ? femaleShare : maleShare;
        const key = vote.user.id;
        
        if (!participantMap.has(key)) {
          participantMap.set(key, {
            userId: vote.user.id,
            name: vote.user.name,
            gender: vote.user.gender,
            amount: 0,
            details: []
          });
        }
        
        const participant = participantMap.get(key);
        participant.amount += amount;
        participant.details.push({ type: 'going', amount });
      });
    
    // Thêm vote hộ đi chơi - TIỀN TÍNH VÀO NGƯỜI VOTE HỘ (VOTER)
    session.proxyVotes
      .filter(pv => pv.voteType === 'VOTE_YES')
      .forEach(proxyVote => {
        // Tính tiền dựa trên giới tính của người ĐƯỢC vote hộ
        const amount = proxyVote.targetUser.gender === 'female' ? femaleShare : maleShare;
        const key = proxyVote.voter.id;
        
        if (!participantMap.has(key)) {
          participantMap.set(key, {
            userId: proxyVote.voter.id,
            name: proxyVote.voter.name,
            gender: proxyVote.voter.gender,
            amount: 0,
            details: []
          });
        }
        
        const participant = participantMap.get(key);
        participant.amount += amount;
        participant.details.push({ 
          type: 'proxy_going', 
          amount,
          targetName: proxyVote.targetUser.name,
          targetGender: proxyVote.targetUser.gender
        });
      });
    
    // Thêm người không đi chơi
    session.votes
      .filter(v => v.voteType === 'VOTE_NO')
      .forEach(vote => {
        const amount = vote.user.gender === 'female' ? femaleNotGoingShare : maleNotGoingShare;
        const key = vote.user.id;
        
        if (!participantMap.has(key)) {
          participantMap.set(key, {
            userId: vote.user.id,
            name: vote.user.name,
            gender: vote.user.gender,
            amount: 0,
            details: []
          });
        }
        
        const participant = participantMap.get(key);
        participant.amount += amount;
        participant.details.push({ type: 'not_going', amount });
      });
    
    // Thêm vote hộ không đi chơi - TIỀN TÍNH VÀO NGƯỜI VOTE HỘ (VOTER)
    // Không đi thì KHÔNG PHÂN BIỆT NAM/NỮ, chỉ chia đều tiền sân
    session.proxyVotes
      .filter(pv => pv.voteType === 'VOTE_NO')
      .forEach(proxyVote => {
        // Proxy vote không đi: CHỈ CHIA TIỀN SÂN, không phân biệt nam/nữ
        const amount = courtSharePerPerson;
        const key = proxyVote.voter.id;
        
        if (!participantMap.has(key)) {
          participantMap.set(key, {
            userId: proxyVote.voter.id,
            name: proxyVote.voter.name,
            gender: proxyVote.voter.gender,
            amount: 0,
            details: []
          });
        }
        
        const participant = participantMap.get(key);
        participant.amount += amount;
        participant.details.push({ 
          type: 'proxy_not_going', 
          amount,
          targetName: proxyVote.targetUser.name,
          targetGender: proxyVote.targetUser.gender
        });
      });
    
    // Convert Map to Array
    const participants = Array.from(participantMap.values());

    // Tạo kết quả chi tiết
    const result = {
      sessionId,
      playDate: session.playDate,
      total,
      courtCount,
      shuttleCount,
      males,
      females,
      malesNotGoing,
      femalesNotGoing,
      maleShare,
      femaleShare,
      maleNotGoingShare,
      femaleNotGoingShare,
      participants,
      breakdown: {
        courtCost: courtTotal,
        shuttleCost: shuttleTotal,
        femaleTotal,
        maleTotal: males * maleShare,
        maleNotGoingTotal: malesNotGoing * maleNotGoingShare,
        femaleNotGoingTotal: femalesNotGoing * femaleNotGoingShare,
        totalParticipants: totalGoing,
        totalNotGoing: totalNotGoing
      }
    };

    // Lưu audit log
    await db.createAuditLog(sessionId, 'COMPUTE_SESSION', {
      result,
      timestamp: new Date().toISOString()
    });

    // Đánh dấu session đã được tính toán
    await db.markSessionComputed(sessionId);

    return result;
  } catch (error) {
    console.error('Error computing session:', error);
    throw error;
  }
}

/**
 * Tạo báo cáo chi tiết cho session
 * @param {Object} result - Kết quả từ computeSession
 * @returns {string} Báo cáo dạng text
 */
function generateSummaryReport(result) {
  const { 
    playDate, total, courtCount, shuttleCount, 
    males, females, malesNotGoing, femalesNotGoing,
    maleShare, femaleShare, maleNotGoingShare, femaleNotGoingShare, 
    breakdown 
  } = result;
  
  // Lấy giá từ env
  const courtPrice = parseInt(process.env.COURT_PRICE) || 120000;
  const shuttlePrice = parseInt(process.env.SHUTTLE_PRICE) || 25000;
  const courtPriceK = Math.round(courtPrice / 1000);
  const shuttlePriceK = Math.round(shuttlePrice / 1000);
  
  const dateStr = playDate.toLocaleDateString('vi-VN');
  
  let report = `🏸 Kết quả ngày ${dateStr}:\n\n`;
  report += `📊 Chi phí:\n`;
  report += `- Sân: ${courtCount} × ${courtPriceK}k = ${breakdown.courtCost.toLocaleString('vi-VN')}đ\n`;
  report += `- Cầu: ${shuttleCount} × ${shuttlePriceK}k = ${breakdown.shuttleCost.toLocaleString('vi-VN')}đ\n`;
  report += `💰 Tổng: ${total.toLocaleString('vi-VN')}đ\n\n`;
  
  report += `👥 Tham gia (chia cả sân + cầu):\n`;
  if (males > 0) {
    report += `- Nam: ${males} lượt × ${maleShare.toLocaleString('vi-VN')}đ\n`;
  }
  if (females > 0) {
    report += `- Nữ: ${females} lượt × ${femaleShare.toLocaleString('vi-VN')}đ\n`;
  }
  
  if (malesNotGoing > 0 || femalesNotGoing > 0) {
    report += `\n❌ Không tham gia (chỉ chia sân):\n`;
    if (malesNotGoing > 0) {
      report += `- Nam: ${malesNotGoing} lượt × ${maleNotGoingShare.toLocaleString('vi-VN')}đ\n`;
    }
    if (femalesNotGoing > 0) {
      report += `- Nữ: ${femalesNotGoing} lượt × ${femaleNotGoingShare.toLocaleString('vi-VN')}đ\n`;
    }
  }
  
  report += `\n📋 Tổng kết:\n`;
  report += `- Người tham gia: ${breakdown.totalParticipants}\n`;
  if (breakdown.totalNotGoing > 0) {
    report += `- Người không tham gia: ${breakdown.totalNotGoing}\n`;
  }
  report += `- Chi phí nam tham gia: ${breakdown.maleTotal.toLocaleString('vi-VN')}đ\n`;
  report += `- Chi phí nữ tham gia: ${breakdown.femaleTotal.toLocaleString('vi-VN')}đ\n`;
  if (breakdown.maleNotGoingTotal > 0) {
    report += `- Chi phí nam không tham gia: ${breakdown.maleNotGoingTotal.toLocaleString('vi-VN')}đ\n`;
  }
  if (breakdown.femaleNotGoingTotal > 0) {
    report += `- Chi phí nữ không tham gia: ${breakdown.femaleNotGoingTotal.toLocaleString('vi-VN')}đ\n`;
  }
  
  return report;
}

/**
 * Lấy thống kê tổng quan
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Object} Thống kê tổng quan
 */
async function getStatistics(startDate, endDate) {
  try {
    const sessions = await db.prisma.session.findMany({
      where: {
        playDate: {
          gte: startDate,
          lte: endDate
        },
        computed: true
      },
      include: {
        votes: {
          include: {
            user: true
          }
        }
      }
    });

    let totalSessions = sessions.length;
    let totalCost = 0;
    let totalParticipants = 0;
    let maleParticipants = 0;
    let femaleParticipants = 0;

    sessions.forEach(session => {
      const result = computeSessionSync(session);
      totalCost += result.total;
      totalParticipants += result.breakdown.totalParticipants;
      maleParticipants += result.males;
      femaleParticipants += result.females;
    });

    return {
      totalSessions,
      totalCost,
      totalParticipants,
      maleParticipants,
      femaleParticipants,
      averageCostPerSession: totalSessions > 0 ? Math.round(totalCost / totalSessions) : 0,
      averageParticipantsPerSession: totalSessions > 0 ? Math.round(totalParticipants / totalSessions) : 0
    };
  } catch (error) {
    console.error('Error getting statistics:', error);
    throw error;
  }
}

/**
 * Tính toán session đồng bộ (không cần database)
 * @param {Object} session - Session object với votes
 * @returns {Object} Kết quả tính toán
 */
function computeSessionSync(session) {
  let males = 0, females = 0;
  let courtCount = session.courtCount;
  let shuttleCount = session.shuttleCount;

  session.votes.forEach(vote => {
    if (vote.voteType === "VOTE_YES") {
      if (vote.user.gender === "female") {
        females++;
      } else {
        males++;
      }
    } else if (vote.voteType === "COURT") {
      courtCount++;
    } else if (vote.voteType === "SHUTTLE") {
      shuttleCount++;
    }
  });

  // Lấy giá từ environment variables
  const courtPrice = parseInt(process.env.COURT_PRICE) || 120000;
  const shuttlePrice = parseInt(process.env.SHUTTLE_PRICE) || 25000;
  const femalePrice = parseInt(process.env.FEMALE_PRICE) || 40000;
  
  const total = (courtCount * courtPrice) + (shuttleCount * shuttlePrice);
  const femaleTotal = females * femalePrice;

  let maleShare = 0;
  let femaleShare = femalePrice;
  let totalParticipants = males + females;

  if (males > 0) {
    maleShare = Math.round((total - femaleTotal) / males);
  } else {
    const perPerson = Math.round(total / totalParticipants);
    maleShare = perPerson;
    femaleShare = perPerson;
  }

  return {
    total,
    courtCount,
    shuttleCount,
    males,
    females,
    maleShare,
    femaleShare,
    breakdown: {
      courtCost: courtCount * courtPrice,
      shuttleCost: shuttleCount * shuttlePrice,
      femaleTotal,
      maleTotal: males * maleShare,
      totalParticipants
    }
  };
}

module.exports = {
  computeSession,
  generateSummaryReport,
  getStatistics,
  computeSessionSync
};
