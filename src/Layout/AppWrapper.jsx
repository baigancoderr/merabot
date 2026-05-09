import { Routes, Route, useLocation ,Navigate  } from "react-router-dom";
import { useEffect, useState } from "react";

import Homepage from "../Pages/Homepage";
import Wallet from "../Pages/Wallet";
import Upgrade from "../Pages/Upgrade";
import Settings from "../Pages/Settings";
import AddFund from "../Pages/AddFund";
import PaymentScreen from "../Components/AddFund/PaymentScreen";
import ReferralTeamTree from "../Components/Settings/Pages/ReferralTeamTree";

import Loader from "../Context/Loader";
import WebProfile from "../Components/Settings/Pages/WebProfile";
// import Profile from "../Components/Settings/Pages/Profile";

function AppWrapper() {
    const ALLOW_BROWSER = true;
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(() => {
      setLoading(false);
    }, 500); // ✅ smooth route transition

    return () => clearTimeout(timer);
  }, [location.pathname]);




if (!window.Telegram || !window.Telegram.WebApp) {
  return null;
}


if (!ALLOW_BROWSER) {
  if (!window.Telegram?.WebApp?.initData) {
    return null;
  }
}

  return (
    <>
    

      {/* 🔥 ROUTES */}
      <Routes>
      {/* <Route path="/" element={<Navigate to="/settings/profile" replace />} /> */}
      <Route path="/" element={<Navigate to="/settings/WebProfile" replace />} /> 

          <Route path="/home" element={<Homepage />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/invest" element={<Upgrade />} />
        <Route path="/addfund" element={<AddFund />} />
        <Route path="/payment" element={<PaymentScreen />} />
        <Route path="/referral-team-tree" element={<ReferralTeamTree />} />

        {/* SETTINGS ROUTES */}
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/WebProfile" element={<Settings />} />
          {/* <Route path="/settings/profile" element={<Settings />} /> */}
        <Route path="/settings/referral" element={<Settings />} />
        <Route path="/settings/referral-earning-history" element={<Settings />} />
        <Route path="/settings/investment-history" element={<Settings />} />
        <Route path="/settings/deposit-history" element={<Settings />} />
        <Route path="/settings/withdraw-usdt" element={<Settings />} />
        <Route path="/settings/faqs" element={<Settings />} />
        <Route path="/settings/privacy" element={<Settings />} />
        <Route path="/settings/term-condition" element={<Settings />} />
         <Route path="/settings/swap-deposit" element={<Settings />} />
        
      </Routes>
    </>
  );
}

export default AppWrapper;