const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "team",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: {
      time: Date,
      latitude: Number,
      longitude: Number,
    },
    checkOut: {
      time: Date,
      latitude: Number,
      longitude: Number,
    },
    status: {
      type: String,
      enum: ["present", "absent", "half-day", "leave"],
      default: "absent"
    },
    workHours: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
    },
    leaveReason: {
      type: String,
    },
    isApproved: {
      type: Boolean,
      default: true, // Set to true if marked by admin, false if self-marked
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ teamId: 1, date: 1 });

// Pre-save middleware to calculate work hours
attendanceSchema.pre('save', function(next) {
  if (this.checkIn?.time && this.checkOut?.time) {
    const hours = (this.checkOut.time - this.checkIn.time) / (1000 * 60 * 60);
    this.workHours = parseFloat(hours.toFixed(2));
    
    // Update status based on work hours
    if (this.workHours >= 8) {
      this.status = 'present';
    } else if (this.workHours >= 4) {
      this.status = 'half-day';
    }
  }
  next();
});

// Static methods for statistics
attendanceSchema.statics = {
  // Get attendance statistics for a specific user within a date range
  async getUserStats(userId, startDate, endDate) {
    return this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $count: {} },
          presentDays: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          halfDays: {
            $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 1, 0] }
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          },
          leaveDays: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] }
          },
          totalWorkHours: { $sum: "$workHours" },
          avgWorkHours: { $avg: "$workHours" }
        }
      }
    ]);
  },

  // Get team attendance statistics for a specific date
  async getTeamDailyStats(teamId, date) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    return this.aggregate([
      {
        $match: {
          teamId: new mongoose.Types.ObjectId(teamId),
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalWorkHours: { $sum: "$workHours" }
        }
      }
    ]);
  }
};

const Attendance = mongoose.model("attendance", attendanceSchema);
module.exports = Attendance;