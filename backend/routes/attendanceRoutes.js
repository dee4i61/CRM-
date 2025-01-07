const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getUserAttendance,
  getTeamAttendance,
  updateAttendance,
  getAllTeamsAttendance,
  getAllMembersAttendance
} = require("../controller/attendanceController");
const {jwtToken} = require("../middleware/auth");


router.post("/mark", jwtToken, markAttendance);
router.get("/user/:userId", jwtToken, getUserAttendance);
router.get("/team/:teamId", jwtToken, getTeamAttendance);
router.get("/all-members", jwtToken, getAllMembersAttendance);

router.patch("/:attendanceId", jwtToken, updateAttendance);
router.get("/teams/summary", jwtToken, getAllTeamsAttendance);

module.exports = router;