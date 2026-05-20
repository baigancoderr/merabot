import React, { useState, useEffect } from "react";
import { ArrowLeft, User, Copy, Share2, Wallet, Mail, Pencil, X } from "lucide-react";
import userimg2 from "../../../assets/setting/user-img.jpeg";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../../api/axios";
import SkeletonPage from "../../../Layout/Skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

// ─── /me fetcher ─────────────────────────────────────────────────────────────
// Component ke bahar hai taaki har render pe naya function na bane
// (stale closure issue avoid hota hai)
const fetchMe = async () => {
  const token = localStorage.getItem("token");

  // Agar token hi nahi hai to fetch mat karo — useQuery ko signal bhejo
  if (!token) throw new Error("NO_TOKEN");

  const res = await api.get("/user/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Backend ne success:false bheja to bhi error throw karo
  if (!res.data.success) throw new Error("FETCH_FAILED");

  // localStorage ko hamesha latest user data se sync rakho
  localStorage.setItem("user", JSON.stringify(res.data.user));

  return res.data.user;
};

// ─── Profile Component ────────────────────────────────────────────────────────
const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Telegram WebApp se mila user object — referral popup mein avatar dikhane ke liye
  const [tgUser, setTgUser] = useState(null);

  // loading = true sirf Telegram init phase mein
  // jab tak ye true hai skeleton dikhta hai chahe kuch bhi ho
  const [loading, setLoading] = useState(true);

  // saving = true jab wallet ka POST/PUT in-flight ho
  // double submit prevent karta hai
  const [saving, setSaving] = useState(false);

  // walletAddress = wallet input field ka controlled value
  const [walletAddress, setWalletAddress] = useState("");

  // isSaved = true ek baar wallet save ho jaye
  // (future use ke liye rakha hai, abhi isEditing se kaam chalta hai)
  const [isSaved, setIsSaved] = useState(false);

  // isEditing = true → wallet input dikhao
  // isEditing = false → wallet display row dikhao
  const [isEditing, setIsEditing] = useState(true);

  // showReferralPopup = true jab naya user directly app khole bina referral link ke
  const [showReferralPopup, setShowReferralPopup] = useState(false);

  // inputReferral = referral popup ke input ka controlled value
  const [inputReferral, setInputReferral] = useState("");

  // activeInfoTab = "wallet" ya "email" — kaun sa tab active hai
  const [activeInfoTab, setActiveInfoTab] = useState("wallet");

  // emailEdit = email input field ka controlled value
  const [emailEdit, setEmailEdit] = useState("");

  // isEmailEditing = true → email input dikhao
  // isEmailEditing = false → email display row dikhao
  const [isEmailEditing, setIsEmailEditing] = useState(false);

  // emailSaving = true jab email ka POST/PUT in-flight ho
  const [emailSaving, setEmailSaving] = useState(false);

  // showQR = true → QR code modal khulta hai
  const [showQR, setShowQR] = useState(false);

  // ─── FIX 1: tokenReady state ──────────────────────────────────────────────
  //
  // YE CRITICAL HAI — seedha localStorage.getItem() useQuery ke enabled mein
  // dene se React reactively update nahi karta tha.
  //
  // Lazy initializer use kiya hai:
  //   - Existing user: localStorage mein token hai → true → useQuery turant fire hoti hai
  //   - New user: localStorage mein kuch nahi → false → useQuery disabled rehti hai
  //
  // Baad mein jab Telegram login success hota hai tab setTokenReady(true) call hota hai
  // jisse React re-render karta hai, enabled=true hota hai, aur /me fetch shuru hoti hai
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

    // FIX 1 ka result: reactive state se enabled control hota hai
    // direct localStorage call se nahi — isliye naye users mein 401 nahi aata
    enabled: tokenReady,

    staleTime: 5 * 60 * 1000,    // 5 min tak cache fresh maana jayega
    refetchOnWindowFocus: false,  // tab switch pe refetch mat karo
    refetchOnMount: false,        // baar baar mount pe cache use karo
    refetchOnReconnect: false,    // network reconnect pe refetch mat karo

    retry: (failureCount, error) => {
      // Token bilkul nahi hai — localStorage clear karo aur retry band karo
      if (error?.message === "NO_TOKEN") {
        localStorage.clear();
        return false;
      }
      // Network blip ya server error — sirf ek baar retry karo
      return failureCount < 1;
    },
  });

  // ─── FIX 2: showSkeleton condition ───────────────────────────────────────
  //
  // PURANA CODE (broken):
  //   const showSkeleton = loading || (!apiUser && meLoading)
  //
  //   Problem: New user direct open kare →
  //     Telegram init khatam → loading=false
  //     tokenReady=false → meLoading=false (query disabled hai)
  //     showSkeleton = false → Main JSX render hota hai
  //     apiUser = undefined → apiUser.name → CRASH! TypeError!
  //
  // NAYA CODE (fixed):
  //   Teen conditions add ki hain:
  //   1. loading          → Telegram init chal rahi hai
  //   2. !apiUser && meLoading   → Query chal rahi hai, data abhi nahi aaya
  //   3. !apiUser && !tokenReady → Token nahi hai, query disabled hai
  //                                 (new user direct open karne pe yahi case hai)
  //                                 Is case mein skeleton dikhta rahega
  //                                 aur referral popup uske upar overlay karega
  //
  // TEEN CASES mein se koi ek true hoga to skeleton dikhega:
  //   Existing user:    loading=true (Telegram init), phir meLoading=true (/me), phir false → Main UI
  //   New user + link:  loading=true (Telegram init), phir meLoading=true (/me), phir false → Main UI
  //   New user direct:  loading=true, phir !tokenReady=true → Skeleton + Referral popup on top
  //                     Submit ke baad tokenReady=true → meLoading=true → apiUser aaya → Main UI
  const showSkeleton = loading || (!apiUser && meLoading) || (!apiUser && !tokenReady);

  // ─── Effect: apiUser sync ─────────────────────────────────────────────────
  // Jab bhi apiUser fresh aaye (cache se ya network se) input fields sync karo
  useEffect(() => {
    if (apiUser) {
      // Agar wallet save hai to display mode mein dikhao
      if (apiUser.walletAddress) {
        setWalletAddress(apiUser.walletAddress);
        setIsSaved(true);
        setIsEditing(false);
      }
      // Agar email save hai to display mode mein dikhao
      if (apiUser.email) {
        setEmailEdit(apiUser.email);
        setIsEmailEditing(false);
      }
    }
  }, [apiUser]);

  // ─── Effect: Telegram init ───────────────────────────────────────────────
  //
  // Teen cases handle karta hai:
  //   Case A: Existing user  → login → setTokenReady(true) → useQuery fires
  //   Case B: New user + link → register → setTokenReady(true) → useQuery fires
  //   Case C: New user direct → no token → setShowReferralPopup(true)
  //           (skeleton continue dikhega — FIX 2 ki wajah se)
  useEffect(() => {
    const initTelegram = async () => {
      try {
        const tg = window.Telegram?.WebApp;

        // Agar Telegram WebApp available nahi (browser dev mode etc.)
        if (!tg) {
          setLoading(false);
          return;
        }

        // Telegram ko signal do ki app ready hai
        tg.ready();

        const user = tg.initDataUnsafe?.user;

        // Agar Telegram user data nahi mila (rare edge case)
        if (!user) {
          setLoading(false);
          return;
        }

        // Referral popup mein Telegram avatar + name dikhane ke liye save karo
        setTgUser(user);

        // Referral code do jagah se read karo:
        //   1. Telegram deep link param (primary)
        //   2. URL query param ?ref= (fallback for browser testing)
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode =
          tg.initDataUnsafe?.start_param || urlParams.get("ref") || "";

        // Backend ko login/register request bhejo
        const res = await api.post("/user/telegram-login", {
          telegramId: user.id,
          name: `${user.first_name} ${user.last_name || ""}`,
          username: user.username || "",
          referralCode, // existing user ke liye ignore hoga backend mein
        });

        const data = res.data;

        if (data.success) {
          // ── Case A + B: Login ya registration successful ──────────────
          // Token aur user IDs localStorage mein save karo
          localStorage.setItem("token", data.token);
          localStorage.setItem("userId", data.user.userId || data.user._id);

          // Agar referral code tha to use bhi save karo
          if (referralCode) localStorage.setItem("referral", referralCode);

          // Popup close karo (agar kisi wajah se khula tha)
          setShowReferralPopup(false);

          // FIX 1 ka core: tokenReady flip karo
          // → React re-render karega
          // → useQuery ka enabled = true ho jayega
          // → /me fetch immediately fire hogi valid token ke saath
          setTokenReady(true);

          // Cache invalidate karo taaki fresh /me data aaye
          await queryClient.invalidateQueries({ queryKey: ["me"] });

        } else if (data.isNewUser || data.message?.toLowerCase().includes("referral")) {
          // ── Case C: Naya user, referral nahi diya ──────────────────────
          // Referral popup dikhao
          // tokenReady mat badlo — abhi koi token nahi hai
          // FIX 2 ki wajah se skeleton dikhta rahega popup ke peeche
          setShowReferralPopup(true);

        } else {
          // Koi aur error — user ko batao
          toast.error(data.message || "Login failed");
        }

      } catch (error) {
        console.error("Telegram Login Error:", error);
        toast.error("Something went wrong");
      } finally {
        // HAMESHA loading false karo — chahe success ho ya error
        // Ye skeleton ka loading gate release karta hai
        setLoading(false);
      }
    };

    initTelegram();
  }, [queryClient]);

  // ─── Effect: body scroll lock ─────────────────────────────────────────────
  // Referral popup khule to background scroll band karo
  useEffect(() => {
    document.body.style.overflow = showReferralPopup ? "hidden" : "auto";
  }, [showReferralPopup]);

  // ─── Handler: Referral code submit ───────────────────────────────────────
  // Jab user manually referral code enter karke "Continue" dabaye
  const handleReferralSubmit = async () => {
    // Format validate karo: CPR + exactly 6 uppercase letters/numbers
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

      // Wahi login endpoint dubara call karo, is baar referral code ke saath
      const res = await api.post("/user/telegram-login", {
        telegramId: user.id,
        name: `${user.first_name} ${user.last_name || ""}`,
        username: user.username || "",
        referralCode: inputReferral,
      });

      const data = res.data;

      if (data.success) {
        // Token aur IDs save karo
        localStorage.setItem("token", data.token);
        localStorage.setItem("referral", inputReferral);
        localStorage.setItem("userId", data.user.userId || data.user._id);

        // Popup band karo
        setShowReferralPopup(false);

        toast.success("Login Success ✅");

        // FIX 1: tokenReady flip karo — same pattern as initTelegram
        // → useQuery fire hogi → /me aayega → apiUser set hoga
        // → showSkeleton false hoga → Main UI dikhega
        setTokenReady(true);

        // Cache invalidate karo taaki fresh data aaye
        await queryClient.invalidateQueries({ queryKey: ["me"] });

      } else {
        // Invalid code ya koi aur backend error
        toast.error(data.message || "Login failed");
      }

    } catch (err) {
      console.error("Referral Submit Error:", err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ─── Handler: Wallet save / update ───────────────────────────────────────
  // POST → naya wallet add karo
  // PUT  → existing wallet update karo
  const handleSaveWallet = async () => {
    if (!walletAddress.trim()) {
      toast.error("Enter wallet address");
      return;
    }

    // Double-submit prevent karo
    if (saving) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      // apiUser mein walletAddress hai ya nahi isse decide hoga POST ya PUT
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

        // Cache invalidate → useQuery refetch → useEffect mein wallet sync hoga
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

  // ─── Handler: Email save / update ────────────────────────────────────────
  // POST → naya email add karo
  // PUT  → existing email update karo
  const handleSaveEmail = async () => {
    if (!emailEdit.trim()) {
      toast.error("Enter email");
      return;
    }

    setEmailSaving(true);

    try {
      const token = localStorage.getItem("token");

      // apiUser mein email hai ya nahi isse decide hoga POST ya PUT
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
        // Cache invalidate → useQuery refetch → useEffect mein email sync hoga
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

  // ─── Handler: Wallet edit button @gouriiii_bot ─────────────────────────────────────────
  const handleUpdate = () => setIsEditing(true);

  // ─── Referral link ───────────────────────────────────────────────────────
  // apiUser nahi aaya to "loading" placeholder dikhao
  const referralLink = `https://t.me/gouriiii_bot?startapp=${apiUser?.referralCode || "loading"}`;

  // ─── Handler: Referral share ─────────────────────────────────────────────
  // Priority: Telegram share sheet → Native share API → Fallback new tab
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

  // ─── Handler: Copy referral link ─────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Copied 🚀");
    } catch {
      toast.error("Copy failed");
    }
  };

  // ─── Skeleton gate ───────────────────────────────────────────────────────
  // FIX 2 wali condition yahan check hoti hai
  // Teen mein se koi bhi true ho to skeleton dikhao:
  //   1. Telegram init chal rahi hai (loading=true)
  //   2. /me query chal rahi hai aur data nahi aaya (!apiUser && meLoading)
  //   3. Token ready nahi aur data nahi — new user direct open case
  //      (!apiUser && !tokenReady)
  if (showSkeleton) {
    return (
      <>
        {/* Skeleton background mein dikhta hai */}
        <SkeletonPage type="profile" />

        {/* ── REFERRAL POPUP (skeleton ke upar) ────────────────────────── */}
        {/* New user direct case mein showReferralPopup=true hoga        */}
        {/* Ye popup skeleton ke upar overlay ki tarah dikhega            */}
        {showReferralPopup && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#0B0F19] border border-[#81ECFF] rounded-2xl p-5 w-[90%] max-w-sm text-center">

              <h2 className="text-lg font-semibold mb-2">Enter Referral Code</h2>

              {/* Telegram avatar + name */}
              <div className="flex flex-col items-center mb-3">
                <img
                  src={tgUser?.photo_url || userimg2}
                  className="w-16 h-16 rounded-full mb-2"
                  alt="telegram avatar"
                />
                <p className="text-sm text-white">
                  {tgUser?.first_name} {tgUser?.last_name}
                </p>
                <p className="text-xs text-gray-400">@{tgUser?.username}</p>
              </div>

              {/* Referral code input — auto uppercase */}
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
      </>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  // Yahan tak pahunchne ka matlab hai:
  //   loading = false  (Telegram init khatam)
  //   apiUser = defined (data aa gaya)
  //   tokenReady = true (token valid hai)
  // Toh apiUser.name etc. safely access ho sakta hai — koi crash nahi
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

            {/* Avatar row */}
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

            {/* User ID + Parent ID */}
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

        {/* ── WALLET + EMAIL TABS ── */}
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
                    {/* Base Network warning */}
                    <div className="mt-2 mb-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                      <p className="text-blue-400 text-xs font-semibold mb-1">Note:</p>
                      <p className="text-[11px] leading-relaxed text-blue-100/80">
                        Please enter your{" "}
                        <span className="text-blue-300 font-semibold">Base Network </span>
                        wallet address only. Sending assets from unsupported networks
                        may result in permanent loss of funds.
                      </p>
                    </div>

                    {/* Wallet input */}
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

                    {/* Cancel + Save */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
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
                        {saving ? "Saving..." : apiUser?.walletAddress ? "Update" : "Save"}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Wallet display */
                  <div className="flex items-center gap-3 bg-black/40 border border-[#ffffff10] rounded-xl px-4 py-3">
                    <p className="text-sm text-gray-300 break-all flex-1 leading-relaxed">
                      {walletAddress || (
                        <span className="text-gray-600 italic">Not set yet</span>
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
                    {/* Email input */}
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

                    {/* Cancel + Save */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
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
                        {emailSaving ? "Saving..." : apiUser?.email ? "Update" : "Save"}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Email display */
                  <div className="flex items-center gap-3 bg-black/40 border border-[#ffffff10] rounded-xl px-4 py-3">
                    <p className="text-sm text-gray-300 break-all flex-1">
                      {emailEdit || (
                        <span className="text-gray-600 italic">Not set yet</span>
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

          <div className="bg-black border border-[#81ECFF] rounded-lg px-3 py-2 text-xs mb-3 overflow-hidden whitespace-nowrap text-ellipsis">
            {referralLink}
          </div>

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

      {/* ── QR MODAL ── */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm rounded-xl border border-[#81ECFF55] bg-[#0B0F19] p-4 text-center">

            <button
              onClick={() => setShowQR(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-semibold mb-2">Referral QR Code</h2>

            <div className="bg-white p-4 rounded-2xl inline-block">
              <QRCodeSVG value={referralLink} size={220} />
            </div>

            <p className="text-xs text-gray-500 break-all mt-5">
              {referralLink}
            </p>

            <button
              onClick={handleCopy}
              className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-[#587FFF] to-[#09239F]"
            >
              Copy Referral Link
            </button>
          </div>
        </div>
      )}

      {/* ── REFERRAL POPUP (main render mein bhi) ── */}
      {/* Ye sirf tab dikhega jab koi skeleton ke baad bhi popup chahiye ho */}
      {/* Edge case: agar somehow showSkeleton false ho gaya lekin popup true rahe */}
      {showReferralPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0B0F19] border border-[#81ECFF] rounded-2xl p-5 w-[90%] max-w-sm text-center">

            <h2 className="text-lg font-semibold mb-2">Enter Referral Code</h2>

            <div className="flex flex-col items-center mb-3">
              <img
                src={tgUser?.photo_url || userimg2}
                className="w-16 h-16 rounded-full mb-2"
                alt="telegram avatar"
              />
              <p className="text-sm text-white">
                {tgUser?.first_name} {tgUser?.last_name}
              </p>
              <p className="text-xs text-gray-400">@{tgUser?.username}</p>
            </div>

            <input
              type="text"
              value={inputReferral}
              onChange={(e) => setInputReferral(e.target.value.toUpperCase())}
              placeholder="Enter CPRXXXXXX"
              className="w-full px-3 py-2 rounded-lg bg-black border border-[#444] text-white mb-3"
            />

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