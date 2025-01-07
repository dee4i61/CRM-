const Attendance = require("../models/attendanceModels");
const User = require("../models/userModels");
const Team = require("../models/teamModels");
const { validationResult } = require("express-validator");

exports.markAttendance = async (req, res) => {
  console.log("markAttendance: Function entered",req.body);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("markAttendance: Validation errors", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { memberId:userId, checkIn, checkOut, status, notes, leaveReason } = req.body;
    const date = new Date(req.body.date);
    console.log("markAttendance: Data received", { userId, date });

    // Check if user exists and belongs to a team
    const user = await User.findById(userId);
    if (!user) {
      console.log("markAttendance: User not found");
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.teamId) {
      console.log("markAttendance: User has no assigned team");
      return res.status(400).json({ message: "User is not assigned to any team" });
    }

    // Check for existing attendance record
    let attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lte: new Date(date.setHours(23, 59, 59, 999)),
      },
    });

    if (attendance) {
      console.log("markAttendance: Existing attendance found");
      attendance.checkIn = checkIn ? { time: new Date(checkIn) } : attendance.checkIn;
      attendance.checkOut = checkOut ? { time: new Date(checkOut) } : attendance.checkOut;
      attendance.status = status || attendance.status;
      attendance.notes = notes || attendance.notes;
      attendance.leaveReason = leaveReason || attendance.leaveReason;
      attendance.markedBy = req.user._id;
    } else {
      console.log("markAttendance: Creating new attendance record");
      attendance = new Attendance({
        userId,
        teamId: user.teamId,
        date,
        checkIn: checkIn ? { time: new Date(checkIn) } : undefined,
        checkOut: checkOut ? { time: new Date(checkOut) } : undefined,
        status,
        notes,
        leaveReason,
        markedBy: req.user._id,
      });
    }

    await attendance.save();
    await attendance.populate('userId', 'name email role');
    
    console.log("markAttendance: Attendance saved successfully");
    res.status(200).json({
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    console.error("markAttendance: Error occurred", error);
    res.status(500).json({
      message: "Error marking attendance",
      error: error.message,
    });
  }
};

exports.getUserAttendance = async (req, res) => {
  console.log("getUserAttendance: Function entered");
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    console.log("getUserAttendance: Params received", { userId, startDate, endDate });

    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);

    const queryStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const queryEndDate = endDate ? new Date(endDate) : new Date();

    const attendance = await Attendance.find({
      userId,
      date: {
        $gte: queryStartDate,
        $lte: queryEndDate,
      },
    }).populate('userId', 'name email role').sort({ date: -1 });

    const stats = await Attendance.getUserStats(
      userId,
      queryStartDate,
      queryEndDate
    );

    console.log("getUserAttendance: Data fetched successfully");
    res.status(200).json({
      attendance,
      statistics: stats[0] || {},
    });
  } catch (error) {
    console.error("getUserAttendance: Error occurred", error);
    res.status(500).json({
      message: "Error fetching attendance",
      error: error.message,
    });
  }
};

exports.getTeamAttendance = async (req, res) => {
  console.log("getTeamAttendance: Function entered");
  try {
    const { teamId } = req.params;
    const date = new Date(req.query.date || new Date());
    console.log("getTeamAttendance: Params received", { teamId, date });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const teamStats = await Attendance.getTeamDailyStats(teamId, date);
    const attendance = await Attendance.find({
      teamId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).populate('userId', 'name email role');

    console.log("getTeamAttendance: Data fetched successfully");
    res.status(200).json({
      attendance,
      statistics: teamStats,
    });
  } catch (error) {
    console.error("getTeamAttendance: Error occurred", error);
    res.status(500).json({
      message: "Error fetching team attendance",
      error: error.message,
    });
  }
};

exports.updateAttendance = async (req, res) => {
  console.log("updateAttendance: Function entered");
  try {
    const { attendanceId } = req.params;
    const updates = req.body;
    console.log("updateAttendance: Params received", { attendanceId, updates });

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      console.log("updateAttendance: Attendance record not found");
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Update allowed fields
    const allowedUpdates = ["checkIn", "checkOut", "status", "notes", "leaveReason"];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        if (field === "checkIn" || field === "checkOut") {
          attendance[field] = { time: new Date(updates[field]) };
        } else {
          attendance[field] = updates[field];
        }
      }
    });

    attendance.markedBy = req.user._id;
    await attendance.save();
    await attendance.populate('userId', 'name email role');

    console.log("updateAttendance: Attendance updated successfully");
    res.status(200).json({
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    console.error("updateAttendance: Error occurred", error);
    res.status(500).json({
      message: "Error updating attendance",
      error: error.message,
    });
  }
};

exports.getAllTeamsAttendance = async (req, res) => {
  console.log("getAllTeamsAttendance: Function entered");
  try {
    const date = new Date(req.query.date || new Date());
    console.log("getAllTeamsAttendance: Date received", { date });

    const teams = await Team.find();
    const teamsAttendance = await Promise.all(
      teams.map(async (team) => {
        const stats = await Attendance.getTeamDailyStats(team._id, date);
        return {
          teamId: team._id,
          teamName: team.teamName,
          statistics: stats,
        };
      })
    );

    console.log("getAllTeamsAttendance: Data fetched successfully");
    res.status(200).json(teamsAttendance);
  } catch (error) {
    console.error("getAllTeamsAttendance: Error occurred", error);
    res.status(500).json({
      message: "Error fetching teams attendance",
      error: error.message,
    });
  }
};

exports.getAllMembersAttendance = async (req, res) => {
  console.log("getAllMembersAttendance: Function entered");
  try {
    const { date } = req.query;
    console.log("getAllMembersAttendance: Query param received", { date });

    // If no date provided, use current date
    const queryDate = date ? new Date(date) : new Date();
    
    // Set the start and end of the day for the query
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    // Get all users with their team information
    const users = await User.find().select('name email teamId').populate('teamId', 'teamName');

    // Get attendance data for all users
    const membersAttendance = await Promise.all(
      users.map(async (user) => {
        // Get attendance record for the specific date
        const attendanceRecord = await Attendance.findOne({
          userId: user._id,
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        });

        // Calculate status statistics for the day
        const dailyStats = {
          present: attendanceRecord?.status === 'present' ? 1 : 0,
          halfDay: attendanceRecord?.status === 'half-day' ? 1 : 0,
          absent: (!attendanceRecord || attendanceRecord.status === 'absent') ? 1 : 0,
          leave: attendanceRecord?.status === 'leave' ? 1 : 0,
          workHours: attendanceRecord?.workHours || 0
        };

        return {
          userId: user._id,
          name: user.name,
          email: user.email,
          team: user.teamId ? {
            id: user.teamId._id,
            name: user.teamId.teamName
          } : null,
          attendance: attendanceRecord ? {
            status: attendanceRecord.status,
            checkIn: attendanceRecord.checkIn,
            checkOut: attendanceRecord.checkOut,
            workHours: attendanceRecord.workHours,
            notes: attendanceRecord.notes,
            leaveReason: attendanceRecord.leaveReason
          } : {
            status: 'absent',
            checkIn: null,
            checkOut: null,
            workHours: 0,
            notes: null,
            leaveReason: null
          },
          dailyStats
        };
      })
    );

    // Calculate overall statistics for the day
    const overallStats = membersAttendance.reduce((acc, member) => {
      const stats = member.dailyStats;
      return {
        totalEmployees: acc.totalEmployees + 1,
        presentCount: acc.presentCount + stats.present,
        halfDayCount: acc.halfDayCount + stats.halfDay,
        absentCount: acc.absentCount + stats.absent,
        leaveCount: acc.leaveCount + stats.leave,
        totalWorkHours: acc.totalWorkHours + stats.workHours
      };
    }, {
      totalEmployees: 0,
      presentCount: 0,
      halfDayCount: 0,
      absentCount: 0,
      leaveCount: 0,
      totalWorkHours: 0
    });

    // Calculate average work hours for the day
    if (overallStats.totalEmployees > 0) {
      overallStats.avgWorkHours = parseFloat((overallStats.totalWorkHours / overallStats.totalEmployees).toFixed(2));
    }

    console.log("getAllMembersAttendance: Data fetched successfully");
    res.status(200).json({
      date: queryDate,
      overallStats,
      members: membersAttendance
    });

  } catch (error) {
    console.error("getAllMembersAttendance: Error occurred", error);
    res.status(500).json({
      message: "Error fetching members attendance",
      error: error.message,
    });
  }
};
module.exports = exports;