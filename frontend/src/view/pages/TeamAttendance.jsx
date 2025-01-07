import React, { useState, useEffect, useCallback } from "react";
import { getTeamById } from "../../services/TeamService";
import { useParams, useNavigate } from "react-router-dom";
import { attendanceService } from "../../services/attendanceServices";

const AttendanceModal = ({ isOpen, onClose, member, onSubmit }) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({
      memberId: member._id,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "absent",
      reason,
    });
    onClose();
    setReason("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Mark Absent for {member?.name}
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1">
            Reason for Absence
          </label>
          <textarea
            className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for absence"
            rows="3"
            required
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            disabled={!reason.trim()}
          >
            Mark Absent
          </button>
        </div>
      </div>
    </div>
  );
};

const TeamAttendance = () => {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [members, setMembers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    member: null,
  });

  const formatTime = (date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const combineDateAndTime = (date, timeString) => {
    if (!timeString) return null;

    const [hours, minutes] = timeString.split(':');
    const dateObj = new Date(date);
    dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return dateObj.toISOString();
  };

  const handleTimeChange = (memberId, newTime) => {
    setMembers((prev) =>
      prev.map((member) =>
        member._id === memberId ? { ...member, customTime: newTime } : member
      )
    );
  };

  const handlePresent = async (member) => {
    try {
      const timeToUse = member.customTime || formatTime(new Date());
      const isCheckIn = !member.checkInTime;

      const dateTimeString = combineDateAndTime(selectedDate, timeToUse);

      const attendanceData = {
        memberId: member._id,
        status: "present",
        date: selectedDate.toISOString().split('T')[0],
        [isCheckIn ? 'checkIn' : 'checkOut']: dateTimeString,
        teamId
      };

      // Optimistically update UI
      setMembers(prev =>
        prev.map(m => {
          if (m._id === member._id) {
            return {
              ...m,
              checkInTime: isCheckIn ? timeToUse : m.checkInTime,
              checkOutTime: !isCheckIn ? timeToUse : m.checkOutTime,
              status: "present"
            };
          }
          return m;
        })
      );

      await attendanceService.markAttendance(attendanceData);
      await fetchAttendanceData();
    } catch (error) {
      console.error("Error marking attendance:", error);
      await fetchAttendanceData();
    }
  };

  const fetchAttendanceData = useCallback(async () => {
    try {
      setLoading(true);
      const [teamResponse, attendanceResponse] = await Promise.all([
        getTeamById(teamId),
        attendanceService.getTeamAttendance(
          teamId,
          selectedDate.toISOString().split('T')[0]
        )
      ]);

      const currentTime = formatTime(new Date());

      const attendanceLookup = {};
      attendanceResponse.attendance.forEach(record => {
        attendanceLookup[record.userId._id] = {
          checkInTime: record.checkIn?.time ? formatTime(new Date(record.checkIn.time)) : null,
          checkOutTime: record.checkOut?.time ? formatTime(new Date(record.checkOut.time)) : null,
          status: record.status,
          reason: record.leaveReason || record.notes
        };
      });

      const updatedMembers = teamResponse.participants.map(member => {
        const attendanceRecord = attendanceLookup[member._id];
        return {
          ...member,
          checkInTime: attendanceRecord?.checkInTime || null,
          checkOutTime: attendanceRecord?.checkOutTime || null,
          status: attendanceRecord?.status || null,
          reason: attendanceRecord?.reason || null,
          customTime: currentTime,
        };
      });

      setMembers(updatedMembers);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedDate]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData, selectedDate]);

  const handleAttendanceSubmit = async (data) => {
    try {
      const dateTimeString = combineDateAndTime(selectedDate, data.time);

      const attendanceData = {
        memberId: data.memberId,
        status: data.status,
        date: selectedDate.toISOString().split('T')[0],
        checkIn: data.status === 'absent' ? undefined : dateTimeString,
        leaveReason: data.status === 'absent' ? data.reason : undefined,
        teamId,
      };

      await attendanceService.markAttendance(attendanceData);
      fetchAttendanceData();
    } catch (error) {
      console.error("Error submitting attendance:", error);
      alert("Failed to update attendance. Please try again.");
      fetchAttendanceData();
    }
  };

  const getAttendanceStatus = (member) => {
    if (member.checkInTime && member.checkOutTime) return "completed";
    if (member.checkInTime) return "checked-in";
    if (member.status === "absent") return "absent";
    return "pending";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 px-4 py-2 text-lg font-medium text-gray-600 hover:text-gray-800 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">ATTENDANCE TABLE</h1>
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staff Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check In/Check Out Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member, index) => {
              const status = getAttendanceStatus(member);

              return (
                <tr
                  key={member._id}
                  className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {member.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.checkInTime && (
                      <div>
                        <span className="font-medium">In:</span> {member.checkInTime}
                        {member.checkOutTime && (
                          <div>
                            <span className="font-medium">Out:</span>{" "}
                            {member.checkOutTime}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {selectedDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <input
                      type="time"
                      value={member.customTime || ""}
                      onChange={(e) => handleTimeChange(member._id, e.target.value)}
                      className="px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      disabled={status === "completed"}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${status === "completed"
                        ? "bg-green-100 text-green-800"
                        : status === "checked-in"
                          ? "bg-blue-100 text-blue-800"
                          : status === "absent"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {status === "completed"
                        ? "Completed"
                        : status === "checked-in"
                          ? "Checked In"
                          : status === "absent"
                            ? `Absent${member.reason ? ` - ${member.reason}` : ""}`
                            : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <div className="flex items-center space-x-2">
                      {status !== "completed" && (
                        <>
                          {status !== "absent" && (
                            <button
                              onClick={() => handlePresent(member)}
                              className={`px-3 py-1 text-white rounded ${status === "checked-in"
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "bg-green-500 hover:bg-green-600"
                                }`}
                            >
                              {status === "checked-in" ? "Check Out" : "Check In"}
                            </button>
                          )}
                          {status === "pending" && (
                            <button
                              onClick={() => setModalConfig({ isOpen: true, member })}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Absent
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AttendanceModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, member: null })}
        member={modalConfig.member}
        onSubmit={handleAttendanceSubmit}
      />
    </div>
  )
}
export default TeamAttendance;