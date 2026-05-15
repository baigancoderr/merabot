'use client';

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, User, Clock, Package, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import usdt from "../../assets/usdt.png";
import usdc from "../../assets/usdc.png";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";

const AddFundPage = () => {
  const navigate = useNavigate();

  const [isChecked, setIsChecked] = useState(false);
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // ✅ Only your 5 required networks
  const networks = [
    // { label: "ERC20 USDT",     value: "WEB20_USDT",   icon: usdt, coin: "USDT" },
    // { label: "Base USDT",      value: "BASE_USDT",    icon: usdt, coin: "USDT" },
    { label: "Base USDC",      value: "BASE_USDC",    icon: usdc, coin: "USDC" },
    // { label: "ETH USDT",       value: "WEB20_USDT",   icon: usdt, coin: "USDT" },
    // { label: "Polygon USDT",   value: "POLYGON_USDT", icon: usdt, coin: "USDT" },
    // { label: "BEP20 USDT",     value: "BEP20_USDT",   icon: usdt, coin: "USDT" }
  ];

  const [selectedNetwork, setSelectedNetwork] = useState("BASE_USDC");

  // Get UserId
  const getUserId = () => {
    const savedUserId = localStorage.getItem("userId");
    if (savedUserId) return savedUserId;

    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.userId || user._id || user.id;
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
    return null;
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Dynamic Dropdown Position
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 260;

      let topPosition = rect.bottom + 8;

      if (topPosition + dropdownHeight > viewportHeight - 20) {
        topPosition = Math.max(rect.top - dropdownHeight - 8, 20);
      }

      setDropdownStyle({
        position: "fixed",
        top: `${topPosition}px`,
        left: `${rect.right - 170}px`,
        width: "170px",
        zIndex: 9999,
      });
    }
  }, [open]);

  const handleQuickAmount = (value) => {
    setAmount(value.replace("$", ""));
  };

  const handleDeposit = async () => {
  const userId = getUserId();

  if (!userId) {
    toast.error("Session expired, login again ");
    setTimeout(() => navigate("/settings"), 1500);
    return;
  }

  if (!amount || Number(amount) <= 0) {
    toast.error("Please Enter Your Amount");
    return;
  }

  if (!isChecked) {
    toast.error("Please Accept Terms & Conditions ");
    return;
  }

  if (Number(amount) < 10) {
    toast.error("Minimum deposit is $10 USDT");
    return;
  }

  setLoading(true);

  try {
    const selected = networks.find(n => n.value === selectedNetwork);

    if (!selected) {
      toast.error("Invalid network selected");
      return;
    }

    console.log(`🔄 Creating deposit:`, {
      userId,
      amount: Number(amount),
      network: selectedNetwork,
      coin: selected.coin
    });

    const res = await api.post("/user/deposit/create", {
      userId,
      amount: Number(amount),
      network: selectedNetwork,
    });

    const data = res.data;

   if (data.success && data.deposit?.address) {
  toast.success("Payment address generated");

navigate("/payment", {
  state: {
    amount,
    coin: selected.coin,
    network: selected.label,
    walletAddress: data.deposit.address,
    qrData: data.deposit.qr_code || data.deposit.address,
    expiresAt: data.deposit.expiresAt,
  },
});

}
    
    
    else {
      const errorMsg = data.message || data.error || "Failed to generate address";
      console.warn("API returned failure:", data);
      toast.error(errorMsg);
    }
  } catch (error) {
    console.error(" Deposit API Error Details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    let msg = "Something went wrong. Please try again.";

    if (error.response?.data?.message) {
      msg = error.response.data.message;
    } else if (error.response?.data?.error) {
      msg = error.response.data.error;
    } else if (error.message && error.message.includes("Network Error")) {
      msg = "Network error. Please check your internet connection.";
    }

    toast.error(msg);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen pb-24 text-white px-3 py-3">
      <div className="max-w-md mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-lg bg-[#00000033] border border-[#444385]"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-semibold">Add Fund</h1>
          </div>

          <div
            onClick={() => navigate("/settings")}
            className="w-10 h-10 flex items-center justify-center rounded-xl 
              bg-gradient-to-r from-[#587FFF] to-[#09239F] 
              shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 transition"
          >
            <User size={18} />
          </div>
        </div>

        {/* AMOUNT CARD */}
        <div className="rounded-2xl border-2 border-[#444385] overflow-visible mb-5 relative">
          <div className="bg-[#00000033] p-4 backdrop-blur-[20px] rounded-2xl">
            <p className="text-gray-400 text-xs mb-2">Enter Amount</p>

            <div 
              ref={buttonRef}
              className="flex items-center bg-black border border-[#444385] rounded-lg px-3 py-2 relative"
            >
              {/* INPUT */}
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent outline-none text-white flex-1 min-w-0"
              />

              {/* NETWORK SELECT BUTTON */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(!open);
                }}
                className="flex items-center gap-2 cursor-pointer ml-3 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={networks.find(n => n.value === selectedNetwork)?.icon}
                    alt="coin"
                    className="w-4 h-4"
                  />
                  <span className="text-sm whitespace-nowrap">
                    {networks.find(n => n.value === selectedNetwork)?.label}
                  </span>
                </div>
                <span className="text-xs text-gray-400">▼</span>
              </div>
            </div>

            <p className="text-xs text-blue-400 mt-2">Minimum: $ 10 USDT</p>
          </div>
        </div>

        {/* QUICK AMOUNTS */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {["$25", "$50", "$100", "$200"].map((amt) => (
            <button
              key={amt}
              onClick={() => handleQuickAmount(amt)}
              className="rounded-xl border-2 border-[#444385] overflow-hidden group"
            >
              <div className="bg-[#00000033] py-3 text-sm group-hover:bg-[linear-gradient(180deg,#020204,#2C6096)] transition-all">
                {amt}
              </div>
            </button>
          ))}
        </div>

        {/* PAYMENT INSTRUCTIONS */}
        <div className="rounded-2xl border-2 border-[#444385] overflow-hidden mb-6">
          <div className="bg-[#00000033] p-4 backdrop-blur-[20px] space-y-4">
            <div className="flex gap-3">
              <Clock className="text-blue-400" size={18} />
              <div>
                <p className="text-sm">20 Minute Timeout</p>
                <p className="text-xs text-gray-400">Complete payment within 20 minutes.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Package className="text-blue-400" size={18} />
              <div>
                <p className="text-sm">Single Transaction</p>
                <p className="text-xs text-gray-400">Send exact amount in one transaction.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <ShieldCheck className="text-blue-400" size={18} />
              <div>
                <p className="text-sm">Network Confirmation</p>
                <p className="text-xs text-gray-400">Funds will reflect after confirmations.</p>
              </div>
            </div>
          </div>
        </div>

        {/* TERMS */}
        <div className="flex items-start gap-2 mb-6">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-1 accent-blue-500"
          />
          <p className="text-xs text-gray-400 leading-relaxed">
            I agree to the{" "}
            <Link 
              to="/settings/term-condition" 
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link 
              to="/settings/privacy" 
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
            >
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* DEPOSIT BUTTON */}
        <button
          onClick={handleDeposit}
          disabled={loading}
          className="w-full py-3 rounded-full font-semibold bg-gradient-to-r from-[#587FFF] to-[#09239F] hover:scale-[1.02] transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Generating Address..." : "Deposit"}
        </button>

        {/* DROPDOWN */}
        {open && (
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-black border border-[#444385] rounded-xl shadow-2xl overflow-hidden"
          >
            {networks.map((net) => (
              <div
                key={net.value}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNetwork(net.value);
                  setOpen(false);
                }}
                className="px-4 py-3.5 cursor-pointer text-sm hover:bg-[#444385]/70 
                           transition-colors flex items-center gap-3 active:bg-[#444385]"
              >
                <img 
                  src={net.icon} 
                  alt="coin" 
                  className="w-5 h-5" 
                />
                <span>{net.label}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default AddFundPage;