// services/attendanceService.js
import api from "./api";

export const attendanceService = {
  // Mark attendance for a user
  markAttendance: async (data) => {
    try {
      console.log("Marking attendance with data:", data); // Log the data being sent
      const response = await api.post("/attendance/mark", data);
      console.log("Attendance marked successfully:", response.data); // Log the response
      return response.data;
    } catch (error) {
      console.error(
        "Error marking attendance:",
        error|| error.message
      ); // Log error details
      throw error.response?.data || error.message;
    }
  },

  // Get attendance for a specific user
  getUserAttendance: async (userId, startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      console.log(
        `Getting attendance for user ${userId} with params:`,
        params.toString()
      ); // Log the parameters
      const response = await api.get(`/attendance/user/${userId}?${params}`);
      console.log("User attendance data:", response.data); // Log the attendance data
      return response.data;
    } catch (error) {
      console.error(
        "Error getting user attendance:",
        error.response?.data || error.message
      ); // Log error details
      throw error.response?.data || error.message;
    }
  },
// In attendanceServices.js
 getAllMembersAttendance : async (date) => {
  const formattedDate = date.toISOString().split('T')[0];
  const response = await api.get(`/attendance/all-members?date=${formattedDate}`);
  return response.data;
},
  // Get attendance for a specific team
  getTeamAttendance: async (teamId, date) => {
    try {
      const params = new URLSearchParams();
      if (date) params.append("date", date);

      console.log(`Getting attendance for team ${teamId} with date:`, date); // Log team attendance request
      const response = await api.get(`/attendance/team/${teamId}?${params}`);
      console.log("Team attendance data:", response.data); // Log the response data
      return response.data;
    } catch (error) {
      console.error(
        "Error getting team attendance:",
        error.response?.data || error.message
      ); // Log error details
      throw error.response?.data || error.message;
    }
  },

  // Update attendance record
  updateAttendance: async (attendanceId, data) => {
    try {
      console.log(
        `Updating attendance record for ID ${attendanceId} with data:`,
        data
      ); // Log data to update
      const response = await api.patch(`/attendance/${attendanceId}`, data);
      console.log("Attendance updated successfully:", response.data); // Log successful update
      return response.data;
    } catch (error) {
      console.error(
        "Error updating attendance:",
        error.response?.data || error.message
      ); // Log error details
      throw error.response?.data || error.message;
    }
  },

  // Get attendance summary for all teams
  getAllTeamsAttendance: async (date) => {
    try {
      const params = new URLSearchParams();
      if (date) params.append("date", date);

      console.log(`Getting attendance summary for all teams with date:`, date); // Log the request for team summary
      const response = await api.get(`/attendance/teams/summary?${params}`);
      console.log("Teams attendance summary:", response); // Log the summary data
      return response.data;
    } catch (error) {
      console.error(
        "Error getting attendance summary:",
        error.response?.data || error.message
      ); // Log error details
      throw error.response?.data || error.message;
    }
  },
};
