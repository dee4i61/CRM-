import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown } from "lucide-react";
import { attendanceService } from "../../services/attendanceServices";

const AttendanceDashboard = () => {
  const [teamsData, setTeamsData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [detailedAttendance, setDetailedAttendance] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeamsData();
  }, [selectedDate]);

  const fetchTeamsData = async () => {
    try {
      setLoading(true);
      const [teamsResponse, membersResponse] = await Promise.all([
        attendanceService.getAllTeamsAttendance(selectedDate),
        attendanceService.getAllMembersAttendance(selectedDate)
      ]);
      
      setTeamsData(teamsResponse);
      const transformedAttendance = membersResponse.members.map(member => ({
        teamName: member.team?.name || 'Unassigned',
        userId: {
          name: member.name
        },
        checkIn: {
          time: member.attendance.checkIn
        },
        checkOut: {
          time: member.attendance.checkOut
        },
        status: member.attendance.status,
        leaveReason: member.attendance.leaveReason,
        notes: member.attendance.notes
      }));
      setDetailedAttendance(transformedAttendance);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    newDate.setHours(12, 0, 0, 0);
    setSelectedDate(newDate);
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!sortConfig.key) return detailedAttendance;

    return [...detailedAttendance].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'teamName':
          aValue = a.teamName.toLowerCase();
          bValue = b.teamName.toLowerCase();
          break;
        case 'memberName':
          aValue = a.userId?.name?.toLowerCase() || '';
          bValue = b.userId?.name?.toLowerCase() || '';
          break;
        case 'checkIn':
          aValue = a.checkIn?.time?.time || '';
          bValue = b.checkIn?.time?.time || '';
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'ascending') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'ascending' ? 
      <ChevronUp className="w-4 h-4 text-blue-500" /> : 
      <ChevronDown className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">
          Attendance Dashboard
        </h1>
        <input
          type="date"
          value={selectedDate.toISOString().split("T")[0]}
          onChange={handleDateChange}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {teamsData.map((team) => (
              <div
                key={team.teamId}
                onClick={() => navigate(`/team-attendance/${team.teamId}`)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-4">{team.teamName}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-green-600">
                      {team.statistics.find((s) => s._id === "present")?.count || 0}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Absent</p>
                    <p className="text-2xl font-bold text-red-600">
                      {team.statistics.find((s) => s._id === "absent")?.count || 0}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Attendance Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <h2 className="text-xl font-semibold p-6 border-b">
              Detailed Attendance Report
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('teamName')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Team</span>
                        {getSortIcon('teamName')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('memberName')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Member Name</span>
                        {getSortIcon('memberName')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('checkIn')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Check In</span>
                        {getSortIcon('checkIn')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedData().map((record, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.teamName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.userId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(record.checkIn?.time?.time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(record.checkOut?.time?.time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${record.status === 'present' 
                            ? 'bg-green-100 text-green-800'
                            : record.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {record.status?.charAt(0).toUpperCase() + record.status?.slice(1) || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceDashboard;