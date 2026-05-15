'use client';
import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, Users, TrendingUp, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../api/axios";
import bgImg from "../../../assets/bgImg.png";
import toast from "react-hot-toast";

const ReferralTeamTree = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch Team Tree
  const { data: treeDataRaw, isLoading, isError } = useQuery({
    queryKey: ["teamTree"],
    queryFn: async () => {
      const res = await api.get("/user/team-tree-view");
      if (res.data.status !== "success") {
        throw new Error(res.data.message || "Failed to fetch team");
      }
      return res.data.data.tree || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Flatten tree into list for easy card display
  const allMembers = useMemo(() => {
    const members = [];

    const traverse = (node, level = 0) => {
      members.push({ ...node, level });
      if (node.children?.length) {
        node.children.forEach(child => traverse(child, level + 1));
      }
    };

    treeDataRaw?.forEach(node => traverse(node));
    return members;
  }, [treeDataRaw]);

  // Search Filter
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return allMembers;
    return allMembers.filter(member =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allMembers, searchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalTeamCount = useMemo(
    () => allMembers.length,
    [allMembers]
  );

  const handleCardClick = (user) => {
    setSelectedUser(user);
  };

  const closeDetail = () => setSelectedUser(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundImage: `url(${bgImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading Team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white pb-2 px-3" style={{ backgroundImage: `url(${bgImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 py-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg bg-[#00000033] border border-[#444385]"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold">My Referral Team</h1>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#0F1625] border border-[#444385] rounded-xl p-4">
            <p className="text-gray-400 text-xs">Total Team</p>
            <p className="text-xl font-bold text-white mt-1">{totalTeamCount}</p>
          </div>
          <div className="bg-[#0F1625] border border-[#444385] rounded-xl p-4">
            <p className="text-gray-400 text-xs">Team Investment</p>
            <p className="text-xl font-bold text-[#81ECFF] mt-1">
              ${treeDataRaw?.[0]?.teamInvestment || 0}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID or email..."
            className="w-full bg-[#1F2937] border border-[#444385] rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Team Members Cards */}
        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No team members found
            </div>
          ) : (
            (() => {
              const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage));
              const startIndex = (currentPage - 1) * itemsPerPage;
              const paginated = filteredMembers.slice(startIndex, startIndex + itemsPerPage);
              return (
                <>
                  {paginated.map((member, index) => {
                    const cardClasses = member.isDeposited
                      ? "bg-[linear-gradient(135deg,_#071824_0%,_#0D395A_100%)] border border-[#7FBCFF] hover:border-[#A8E4FF]"
                      : member.level === 0
                      ? "bg-[#2F290E] border border-[#F5C34D] hover:border-[#F5C34D]"
                      : "bg-[#0F1625] border border-[#444385] hover:border-[#587FFF]";
                    const badgeClasses = member.isDeposited
                      ? "bg-[#07345B] text-[#B8EFFF] border border-[#7FBCFF]"
                      : member.level === 0
                      ? "bg-[#3F370F] text-[#F3D079] border border-[#F5C34D]"
                      : "bg-[#1F2937] text-blue-400 border border-[#444385]";

                    return (
                      <motion.div
                        key={member.id || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleCardClick(member)}
                        className={`rounded-2xl p-5 transition-all duration-300 cursor-pointer active:scale-[0.985] ${cardClasses}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#587FFF] to-[#09239F] flex items-center justify-center">
                            <User size={24} color="#fff" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-lg truncate">{member.name || "Unnamed"}</p>
                              <span className={`text-xs px-3 py-1 rounded-full ${badgeClasses}`}>
                                {member.isDeposited ? "PREMIUM" : member.level === 0 ? "YOU" : `Level ${member.level}`}
                              </span>
                            </div>

                            <p className="text-[#94a3b8] text-sm">ID: {member.userId}</p>
                            <p className="text-[#81ECFF] font-medium mt-2 text-sm">
                              Self: ${member.selfInvestment || 0} | Team: ${member.teamInvestment || 0}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-400">
                      Showing {startIndex + 1} - {Math.min(startIndex + paginated.length, filteredMembers.length)} of {filteredMembers.length}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-[#1F2937] text-gray-500 cursor-not-allowed' : 'bg-[#587FFF] text-white'}`}
                      >
                        Prev
                      </button>

                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`px-3 py-1 rounded-md ${currentPage === i + 1 ? 'bg-white text-black' : 'bg-[#0F1625] text-gray-300 border border-[#444385]'}`}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-[#1F2937] text-gray-500 cursor-not-allowed' : 'bg-[#587FFF] text-white'}`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              );
            })()
          )}
        </div>

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedUser && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#0F1625] border border-[#587FFF] rounded-xl w-full max-w-md overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                      <p className="text-blue-400">ID: {selectedUser.userId}</p>
                    </div>
                    <button
                      onClick={closeDetail}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-[#1A2338] rounded-xl p-3">
  <p className="text-gray-400 text-sm">Email</p>
  <p className="text-white truncate">
    {selectedUser.email || "Not provided"}
  </p>
</div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#1A2338] rounded-xl p-3">
                        <p className="text-gray-400 text-sm">Self Investment</p>
                        <p className="text-xl font-bold text-[#81ECFF]">
                          ${selectedUser.selfInvestment || 0}
                        </p>
                      </div>
                      <div className="bg-[#1A2338] rounded-xl p-3">
                        <p className="text-gray-400 text-sm">Team Investment</p>
                        <p className="text-xl font-bold text-[#81ECFF]">
                          ${selectedUser.teamInvestment || 0}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#1A2338] rounded-xl p-3">
                      <p className="text-gray-400 text-sm mb-2">Direct Referrals: {selectedUser.children?.length || 0}</p>
                      {selectedUser.children?.length > 0 && (
                        <div className="text-sm text-gray-300">
                          {selectedUser.children.map((child, i) => (
                            <p key={i}>• {child.name} ({child.userId})</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* <div className="border-t border-[#444385] p-4">
                  <button
                    onClick={closeDetail}
                    className="w-full py-3 bg-[#587FFF] hover:bg-[#6C8CFF] rounded-2xl font-medium transition"
                  >
                    Close Details
                  </button>
                </div> */}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReferralTeamTree;