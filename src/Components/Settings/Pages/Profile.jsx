import React, { useState, useEffect } from "react";
import { ArrowLeft, User, Copy, Share2, Wallet, Mail, Pencil, X } from "lucide-react";
import userimg2 from "../../../assets/setting/user-img.jpeg";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../../api/axios";
import SkeletonPage from "../../../Layout/Skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

// ─── /me fetcher (outside component, no stale closure issues) ───────────────
const fetchMe = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("NO_TOKEN");

  const res = await api.get("/user/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.data.success) throw new Error("FETCH_FAILED");

  // Keep localStorage in sync
  localStorage.setItem("user", JSON.stringify(res.data.user));
  return res.data.user;
};

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── Telegram user state (set after tg.ready()) ──────────────────────────
  const [tgUser, setTgUser] = useState(null);

  // loading = true only during Telegram init phase
  const [loading, setLoading] = useState(true);

  // saving = true while wallet POST/PUT is in flight
  const [saving, setSaving] = useState(false);

  // walletAddress = controlled input value for wallet field
  const [walletAddress, setWalletAddress] = useState("");

  // isSaved = true once wallet has been saved at least once
  const [isSaved, setIsSaved] = useState(false);

  // isEditing = true shows wallet input, false shows wallet display
  const [isEditing, setIsEditing] = useState(true);

  // showReferralPopup = true when new user opens app without referral in URL
  const [showReferralPopup, setShowReferralPopup] = useState(false);

  // inputReferral = controlled input value in referral popup
  const [inputReferral, setInputReferral] = useState("");

  // ─── Wallet & Email tab state ─────────────────────────────────────────────
  // activeInfoTab controls which tab is shown: "wallet" or "email"
  const [activeInfoTab, setActiveInfoTab] = useState("wallet");

  // emailEdit = controlled input value for email field
  const [emailEdit, setEmailEdit] = useState("");

  // isEmailEditing = true shows email input, false shows email display
  const [isEmailEditing, setIsEmailEditing] = useState(false);

  // emailSaving = true while email POST/PUT is in flight
  const [emailSaving, setEmailSaving] = useState(false);

  // showQR = true opens QR code modal
  const [showQR, setShowQR] = useState(false);

  // ─── FIX: tokenReady state ────────────────────────────────────────────────
  // Initialised lazily from localStorage so existing users get true immediately.
  // New users start with false → useQuery stays disabled → no 401 crash.
  // After Telegram login succeeds we call setTokenReady(true) which re-renders
  // the component, flips enabled to true, and useQuery fires with a valid token.
  const [tokenReady, setTokenReady] = useState(
    () => !!localStorage.getItem("token")
  );

  // ─── TanStack Query: /me ─────────────────────────────────────────────────
  const {
    data: apiUser,
    isLoading: meLoading,
  } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,

    // Uses reactive state — NOT direct localStorage call.
    // React re-evaluates this whenever tokenReady changes.
    enabled: tokenReady,

    staleTime: 5 * 60 * 1000,       // 5 min — avoid unnecessary refetches
    refetchOnWindowFocus: false,     // don't refetch when tab regains focus
    refetchOnMount: false,           // use cache on subsequent mounts
    refetchOnReconnect: false,       // don't refetch on network reconnect

    retry: (failureCount, error) => {
      // If token is missing entirely, clear storage and stop retrying
      if (error?.message === "NO_TOKEN") {
        localStorage.clear();
        return false;
      }
      // For other errors (network blip, server error) retry once
      return failureCount < 1;
    },
  });

  // showSkeleton = true during Telegram init OR during first /me fetch
  const showSkeleton = loading || (!apiUser && meLoading);

  // ─── Sync wallet & email fields whenever apiUser arrives ─────────────────
  // Runs when cache data lands AND when fresh network data lands
  useEffect(() => {
    if (apiUser) {
      if (apiUser.walletAddress) {
        setWalletAddress(apiUser.walletAddress);
        setIsSaved(true);
        setIsEditing(false);
      }
      if (apiUser.email) {
        setEmailEdit(apiUser.email);
        setIsEmailEditing(false);
      }
    }
  }, [apiUser]);

  // ─── Telegram init effect ─────────────────────────────────────────────────
  // Runs once on mount. Handles 3 cases:
  //   1. Existing user   → login succeeds → setTokenReady(true) → useQuery fires
  //   2. New user + link → referral in URL → auto-register → setTokenReady(true)
  //   3. New user direct → no referral → show popup
  useEffect(() => {
    const initTelegram = async () => {
      try {
        const tg = window.Telegram?.WebApp;
        if (!tg) {
          // Not inside Telegram (e.g. browser dev mode) — stop loading gate
          setLoading(false);
          return;
        }

        tg.ready();
        const user = tg.initDataUnsafe?.user;
        if (!user) {
          // Telegram available but user data missing — stop loading gate
          setLoading(false);
          return;
        }

        // Save Telegram user for referral popup avatar display
        setTgUser(user);

        // Read referral code from Telegram deep link or fallback URL param
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode =
          tg.initDataUnsafe?.start_param || urlParams.get("ref") || "";

        const res = await api.post("/user/telegram-login", {
          telegramId: user.id,
          name: `${user.first_name} ${user.last_name || ""}`,
          username: user.username || "",
          referralCode,
        });

        const data = res.data;

        if (data.success) {
          // ── Existing user OR new user with valid referral link ───────────
          localStorage.setItem("token", data.token);
          localStorage.setItem("userId", data.user.userId || data.user._id);
          if (referralCode) localStorage.setItem("referral", referralCode);

          setShowReferralPopup(false);

          // KEY FIX: flip tokenReady → useQuery's enabled becomes true →
          // React re-renders → /me fetch fires immediately with valid token
          setTokenReady(true);

          // Invalidate any stale cache so fresh user data is fetched
          await queryClient.invalidateQueries({ queryKey: ["me"] });

        } else if (data.isNewUser || data.message?.toLowerCase().includes("referral")) {
          // ── New user opened app directly — needs to enter referral ───────
          setShowReferralPopup(true);
          // Do NOT setTokenReady here — no token yet
        } else {
          toast.error(data.message || "Login failed");
        }
      } catch (error) {
        console.error("Telegram Login Error:", error);
        toast.error("Something went wrong");
      } finally {
        // Always release the Telegram init loading gate
        setLoading(false);
      }
    };

    initTelegram();
  }, [queryClient]);

  // ─── Lock body scroll when referral popup is visible ─────────────────────
  useEffect(() => {
    document.body.style.overflow = showReferralPopup ? "hidden" : "auto";
  }, [showReferralPopup]);

  // ─── Referral code submit handler ─────────────────────────────────────────
  // Called when user manually enters their referral code in the popup
  const handleReferralSubmit = async () => {
    // Validate format: must match CPR + 6 uppercase alphanumeric chars
    if (!/^CPR[A-Z0-9]{6}$/.test(inputReferral)) {
      toast.error("Invalid Referral Code");
      return;
    }

    setLoading(true);
    try {
      const tg = window.Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;
      if (!user) {
        toast.error("Telegram user not found");
        return;
      }

      const res = await api.post("/user/telegram-login", {
        telegramId: user.id,
        name: `${user.first_name} ${user.last_name || ""}`,
        username: user.username || "",
        referralCode: inputReferral,
      });

      const data = res.data;

      if (data.success) {
        // Save everything to localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("referral", inputReferral);
        localStorage.setItem("userId", data.user.userId || data.user._id);

        setShowReferralPopup(false);
        toast.success("Login Success ✅");

        // KEY FIX: same pattern — flip tokenReady so useQuery fires
        setTokenReady(true);

        // Invalidate cache so fresh /me data is loaded
        await queryClient.invalidateQueries({ queryKey: ["me"] });
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Referral Submit Error:", err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ─── Wallet save / update handler ─────────────────────────────────────────
  // Uses POST if no wallet exists yet, PUT if updating existing wallet
  const handleSaveWallet = async () => {
    if (!walletAddress.trim()) {
      toast.error("Enter wallet address");
      return;
    }
    // Prevent double-submit while already saving
    if (saving) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      const res = !apiUser?.walletAddress
        ? await api.post(
            "/user/add-wallet",
            { walletAddress },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        : await api.put(
            "/user/update-wallet",
            { walletAddress },
            { headers: { Authorization: `Bearer ${token}` } }
          );

      if (res.data.success) {
        toast.success(res.data.message || "Wallet saved successfully");

        // Invalidate → useQuery refetches → wallet field syncs via useEffect
        await queryClient.invalidateQueries({ queryKey: ["me"] });

        setIsSaved(true);
        setIsEditing(false);
      } else {
        toast.error(res.data.message || "Failed");
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "API Error");
    } finally {
      setSaving(false);
    }
  };

  // ─── Email save / update handler ──────────────────────────────────────────
  // Uses POST if no email exists yet, PUT if updating existing email
  const handleSaveEmail = async () => {
    if (!emailEdit.trim()) {
      toast.error("Enter email");
      return;
    }

    setEmailSaving(true);
    try {
      const token = localStorage.getItem("token");

      // Same pattern as wallet — POST for first time, PUT for update
      const isUpdate = !!apiUser?.email;

      const res = isUpdate
        ? await api.put(
            "/user/update-email",
            { email: emailEdit.toLowerCase() },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        : await api.post(
            "/user/add-email",
            { email: emailEdit.toLowerCase() },
            { headers: { Authorization: `Bearer ${token}` } }
          );

      if (res.data.success) {
        toast.success(res.data.message || "Email updated");
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        setIsEmailEditing(false);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update email");
    } finally {
      setEmailSaving(false);
    }
  };

  // ─── Wallet edit button handler ───────────────────────────────────────────
  const handleUpdate = () => setIsEditing(true);

  // ─── Referral link helpers ────────────────────────────────────────────────
  const referralLink = `https://t.me/cipera_bot?startapp=${apiUser?.referralCode || "loading"}`;

  // Share via Telegram share sheet, native share API, or fallback new tab
  const handleShare = () => {
    const text = "Join and earn 🚀";
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`
      );
    } else if (navigator.share) {
      navigator.share({ title: "Join Now 🚀", text, url: referralLink });
    } else {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
  };

  // Copy referral link to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Copied 🚀");
    } catch {
      toast.error("Copy failed");
    }
  };

  // ─── Loading gate ─────────────────────────────────────────────────────────
  // Show skeleton during Telegram init OR while first /me fetch is in flight
  if (showSkeleton) {
    return <SkeletonPage type="profile" />;
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex justify-center pb-24 px-2 py-3 text-white">
      <div className="w-full max-w-md">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-lg bg-[#00000033] border border-[#444385]"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold">User Account</h2>
          </div>
          <div
            onClick={() => navigate("/settings")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#587FFF] to-[#09239F] shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 transition"
          >
            <User size={18} />
          </div>
        </div>

        {/* ── PROFILE CARD ── */}
        <div className="relative rounded-2xl border border-[#81ECFF99] p-[1px] mb-5 bg-gradient-to-br from-blue-500/20 to-black/30">
          <div className="rounded-2xl p-4 bg-[#0B0F19]">

            {/* Avatar + name + email row */}
            <div className="flex items-center gap-4 min-w-0">
              <img
                src={userimg2}
                className="w-20 h-20 rounded-full border border-white/20 object-cover shrink-0"
                alt="user"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold truncate">
                  {apiUser.name}
                </h2>
                <p className="text-sm text-gray-400 break-all">
                  {apiUser.email}
                </p>
              </div>
            </div>

            {/* User ID + Parent ID badges */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[#00000020] p-3 rounded-xl border border-[#444B55]">
                <p className="text-xs text-gray-400">USER ID</p>
                <p className="text-white">{apiUser?.userId || "N/A"}</p>
              </div>
              <div className="bg-[#00000020] p-3 rounded-xl border border-[#444B55]">
                <p className="text-xs text-gray-400">PARENT ID</p>
                <p className="text-white">{apiUser?.referredBy || "N/A"}</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── WALLET + EMAIL TABBED SECTION ── */}
        <div className="rounded-2xl border border-[#444B55] bg-[#00000033] backdrop-blur-[10px] mb-4 overflow-hidden">

          {/* Tab header */}
          <div className="flex bg-[#1B2028] border-b border-[#444B55] p-1 gap-1">
            <button
              onClick={() => setActiveInfoTab("wallet")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl transition ${
                activeInfoTab === "wallet"
                  ? "bg-gradient-to-r from-[#587FFF] to-[#09239F] text-white font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Wallet size={14} />
              Wallet
            </button>
            <button
              onClick={() => setActiveInfoTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl transition ${
                activeInfoTab === "email"
                  ? "bg-gradient-to-r from-purple-600 to-[#09239F] text-white font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Mail size={14} />
              Email
            </button>
          </div>

          {/* Tab content */}
          <div className="px-5 py-4">

            {/* ── WALLET TAB ── */}
            {activeInfoTab === "wallet" && (
              <div className="space-y-3">

                {/* Label row + edit button */}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-400">Your Wallet address</p>
                  {!isEditing && (
                    <button
                      onClick={handleUpdate}
                      className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 rounded-full hover:bg-blue-400/20 transition"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <>
                    {/* Warning note about Base Network only */}
                    <div className="mt-2 mb-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                      <p className="text-blue-400 text-xs font-semibold mb-1">
                        Note:
                      </p>
                      <p className="text-[11px] leading-relaxed text-blue-100/80">
                        Please enter your{" "}
                        <span className="text-blue-300 font-semibold">
                          Base Network{" "}
                        </span>
                        wallet address only. Sending assets from unsupported
                        networks may result in permanent loss of funds.
                      </p>
                    </div>

                    {/* Wallet input with clear button */}
                    <div className="relative">
                      <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="Enter your wallet address"
                        className="w-full px-4 py-3 pr-10 rounded-xl text-sm bg-black border border-[#81ECFF] text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#81ECFF]/40"
                      />
                      {walletAddress && (
                        <button
                          onClick={() => setWalletAddress("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Cancel + Save/Update buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          // Reset to last saved value and exit edit mode
                          setWalletAddress(apiUser?.walletAddress || "");
                          setIsEditing(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm border border-[#444385] text-gray-400 hover:bg-white/5 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveWallet}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl text-sm bg-gradient-to-r from-[#587FFF] to-[#09239F] text-white font-medium disabled:opacity-50 active:scale-95 transition"
                      >
                        {saving
                          ? "Saving..."
                          : apiUser?.walletAddress
                          ? "Update"
                          : "Save"}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Wallet display row (non-editing state) */
                  <div className="flex items-center gap-3 bg-black/40 border border-[#ffffff10] rounded-xl px-4 py-3">
                    <p className="text-sm text-gray-300 break-all flex-1 leading-relaxed">
                      {walletAddress || (
                        <span className="text-gray-600 italic">
                          Not set yet
                        </span>
                      )}
                    </p>
                    {walletAddress && (
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(walletAddress);
                          toast.success("Wallet address copied!");
                        }}
                        className="shrink-0 text-gray-500 hover:text-blue-400 transition"
                      >
                        <Copy size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── EMAIL TAB ── */}
            {activeInfoTab === "email" && (
              <div className="space-y-3">

                {/* Label row + edit button */}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-400">Your Email address</p>
                  {!isEmailEditing && (
                    <button
                      onClick={() => setIsEmailEditing(true)}
                      className="flex items-center gap-1.5 text-xs text-purple-400 border border-purple-400/30 bg-purple-400/10 px-3 py-1.5 rounded-full hover:bg-purple-400/20 transition"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                  )}
                </div>

                {isEmailEditing ? (
                  <>
                    {/* Email input with clear button */}
                    <div className="relative">
                      <input
                        type="email"
                        value={emailEdit}
                        onChange={(e) => setEmailEdit(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full px-4 py-3 pr-10 rounded-xl text-sm bg-black border border-purple-400/60 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-400/40"
                      />
                      {emailEdit && (
                        <button
                          onClick={() => setEmailEdit("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Cancel + Save/Update buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          // Reset to last saved value and exit edit mode
                          setEmailEdit(apiUser?.email || "");
                          setIsEmailEditing(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm border border-[#444385] text-gray-400 hover:bg-white/5 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEmail}
                        disabled={emailSaving}
                        className="flex-1 py-2.5 rounded-xl text-sm bg-gradient-to-r from-purple-600 to-[#09239F] text-white font-medium disabled:opacity-50 active:scale-95 transition"
                      >
                        {emailSaving
                          ? "Saving..."
                          : apiUser?.email
                          ? "Update"
                          : "Save"}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Email display row (non-editing state) */
                  <div className="flex items-center gap-3 bg-black/40 border border-[#ffffff10] rounded-xl px-4 py-3">
                    <p className="text-sm text-gray-300 break-all flex-1">
                      {emailEdit || (
                        <span className="text-gray-600 italic">
                          Not set yet
                        </span>
                      )}
                    </p>
                    {emailEdit && (
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(emailEdit);
                          toast.success("Email copied!");
                        }}
                        className="shrink-0 text-gray-500 hover:text-purple-400 transition"
                      >
                        <Copy size={17} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── REFERRAL SECTION ── */}
        <div className="rounded-xl border border-[#444B55] p-4 bg-[#00000020]">
          <p className="text-sm text-gray-300 mb-2">Referral Link</p>

          {/* Referral link display — single line, overflow hidden */}
          <div className="bg-black border border-[#81ECFF] rounded-lg px-3 py-2 text-xs mb-3 overflow-hidden whitespace-nowrap text-ellipsis">
            {referralLink}
          </div>

          {/* Copy / Share / QR buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 bg-gradient-to-r from-[#587FFF] to-[#09239F] py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Copy size={16} /> Copy
            </button>
            <button
              onClick={handleShare}
              className="flex-1 bg-gradient-to-r from-[#587FFF] to-[#09239F] py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Share2 size={16} /> Share
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="flex-1 bg-gradient-to-r from-[#587FFF] to-[#09239F] py-2 rounded-lg flex items-center justify-center gap-2"
            >
              QR
            </button>
          </div>
        </div>

      </div>

      {/* ── QR CODE MODAL ── */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm rounded-xl border border-[#81ECFF55] bg-[#0B0F19] p-4 text-center">

            {/* Close button */}
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-semibold mb-2">Referral QR Code</h2>

            {/* QR code — white background for scanner contrast */}
            <div className="bg-white p-4 rounded-2xl inline-block">
              <QRCodeSVG value={referralLink} size={220} />
            </div>

            {/* Full link displayed below QR */}
            <p className="text-xs text-gray-500 break-all mt-5">
              {referralLink}
            </p>

            {/* Copy button inside modal */}
            <button
              onClick={handleCopy}
              className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-[#587FFF] to-[#09239F]"
            >
              Copy Referral Link
            </button>
          </div>
        </div>
      )}

      {/* ── REFERRAL CODE ENTRY POPUP ── */}
      {/* Shown when new user opens app directly without a referral link */}
      {showReferralPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0B0F19] border border-[#81ECFF] rounded-2xl p-5 w-[90%] max-w-sm text-center">

            <h2 className="text-lg font-semibold mb-2">Enter Referral Code</h2>

            {/* Telegram avatar + name display */}
            <div className="flex flex-col items-center mb-3">
              <img
                src={tgUser?.photo_url || userimg2}
                className="w-16 h-16 rounded-full mb-2"
                alt="telegram avatar"
              />
              <p className="text-sm">
                {tgUser?.first_name} {tgUser?.last_name}
              </p>
              <p className="text-xs text-gray-400">@{tgUser?.username}</p>
            </div>

            {/* Referral code input — auto-uppercased */}
            <input
              type="text"
              value={inputReferral}
              onChange={(e) => setInputReferral(e.target.value.toUpperCase())}
              placeholder="Enter CPRXXXXXX"
              className="w-full px-3 py-2 rounded-lg bg-black border border-[#444] text-white mb-3"
            />

            {/* Submit button — disabled + spinner while loading */}
            <button
              onClick={handleReferralSubmit}
              disabled={loading}
              className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 bg-gradient-to-r from-[#587FFF] to-[#09239F] ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Continue"
              )}
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;