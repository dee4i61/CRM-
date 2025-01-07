import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  Filter,
  Calendar,
  List,
  ChevronDown,
  SortAsc,
  SortDesc,
} from "lucide-react";

// Assuming you have these service functions imported
import { getAllUser } from "../../services/userService";
import { getAllTodos } from "../../services/taskService";

const UserTasksDashboard = () => {
  // State management
  const [users, setUsers] = useState([]);
  const [todos, setTodos] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // Refs for dropdown controls
  const userDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Set default date to today on component mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFilterDate(today);
  }, []);

  // Fetch users and todos on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedUsers = await getAllUser();
        const fetchedTodos = await getAllTodos();

        setUsers(fetchedUsers);
        setTodos(fetchedTodos);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setIsUserDropdownOpen(false);
      }
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target)
      ) {
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper function for formatting dates to ISO string
  const formatDateToISO = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  // Memoized and filtered todos
  const filteredTodos = useMemo(() => {
    return todos
      .filter((todo) => {
        const todoDate = formatDateToISO(todo.createdAt);
        return (
          (!selectedUser || todo.userId === selectedUser) &&
          (!filterDate || todoDate === filterDate)
        );
      })
      .sort((a, b) => {
        const valueA = new Date(a[sortBy]);
        const valueB = new Date(b[sortBy]);
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      });
  }, [todos, selectedUser, filterDate, sortBy, sortDirection]);

  // Render todo card
  const TodoCard = ({ todo }) => {
    // Find the user for this todo
    const todoUser = users.find((user) => user._id === todo.userId);
    console.log("todoUser", todoUser);

    return (
      <div className="bg-white shadow-md rounded-lg p-4 mb-3 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">{todo.title}</h3>
          <span
            className={`px-2 py-1 rounded text-xs font-bold 
              ${
                todo.priority === "High"
                  ? "bg-red-100 text-red-800"
                  : todo.priority === "Medium"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              }`}
          >
            {todo.priority}
          </span>
        </div>
        <p className="text-gray-600 mt-2">
          {todo.description || "No description"}
        </p>
        <div className="mt-3 flex justify-between text-sm text-gray-500">
          <div className="flex flex-col w-full ">
            <span>
              Created: {new Date(todo.createdAt).toLocaleDateString()}
            </span>
            <span>Status: {todo.status.name}</span>
            {/* Display user name if available */}
            {todoUser && (
              <div className="flex justify-between w-full ">
                <span className="mt-1 font-medium text-gray-700 flex items-center">
                  User :{todoUser.name}
                </span>
                {todoUser.teamId && (
                  <span className="mt-1 font-medium text-gray-700 flex items-center">
                    Dept: {todoUser.teamId.department}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  // Custom dropdown for users
  const UserDropdown = () => (
    <div ref={userDropdownRef} className="relative w-full">
      <div
        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
        className="w-full p-2 border rounded flex items-center justify-between cursor-pointer hover:bg-gray-100"
      >
        <span>
          {selectedUser
            ? users.find((user) => user._id === selectedUser)?.name
            : "All Users"}
        </span>
        <ChevronDown className="text-gray-500" size={20} />
      </div>
      {isUserDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
          <div
            onClick={() => {
              setSelectedUser(null);
              setIsUserDropdownOpen(false);
            }}
            className="p-2 hover:bg-gray-100 cursor-pointer"
          >
            All Users
          </div>
          {users.map((user) => (
            <div
              key={user._id}
              onClick={() => {
                setSelectedUser(user._id);
                setIsUserDropdownOpen(false);
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {user.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Custom dropdown for sorting
  const SortDropdown = () => (
    <div ref={sortDropdownRef} className="relative w-full">
      <div
        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
        className="w-full p-2 border rounded flex items-center justify-between cursor-pointer hover:bg-gray-100"
      >
        <span>
          Sort by: {sortBy === "createdAt" ? "Created Date" : "Updated Date"}
        </span>
        {sortDirection === "asc" ? (
          <SortAsc className="text-gray-500" size={20} />
        ) : (
          <SortDesc className="text-gray-500" size={20} />
        )}
      </div>
      {isSortDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg">
          <div
            onClick={() => {
              setSortBy("createdAt");
              setIsSortDropdownOpen(false);
            }}
            className="p-2 hover:bg-gray-100 cursor-pointer"
          >
            Created Date
          </div>
          <div
            onClick={() => {
              setSortBy("updatedAt");
              setIsSortDropdownOpen(false);
            }}
            className="p-2 hover:bg-gray-100 cursor-pointer"
          >
            Updated Date
          </div>
          <div
            onClick={() => {
              setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              setIsSortDropdownOpen(false);
            }}
            className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
          >
            <span>Sort Order</span>
            {sortDirection === "asc" ? (
              <SortAsc size={20} />
            ) : (
              <SortDesc size={20} />
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="rounded-lg overflow-hidden">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-medium text-zinc-800 flex items-center">
            User Tasks Dashboard
          </h1>
        </div>

        {/* Filters and Controls */}
        <div className="p-6 bg-white grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* User Filter */}
          <div className="relative">
            <UserDropdown />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                // Use the selected date directly
                setFilterDate(e.target.value);
              }}
              className="w-full p-2 border rounded appearance-none"
            />
            <Calendar
              className="absolute right-3 top-3 text-gray-500 pointer-events-none"
              size={20}
            />
          </div>

          {/* Sort Controls */}
          <div>
            <SortDropdown />
          </div>
        </div>

        {/* Todos List */}
        <div className="p-6">
          {filteredTodos.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No todos found matching the current filters.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTodos.map((todo) => (
                <TodoCard key={todo._id} todo={todo} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserTasksDashboard;
