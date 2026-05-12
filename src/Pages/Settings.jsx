import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Footer from "../Components/Footer";
import SettingsComponent from "../Components/Settings/Settings";
import PrivacyPolicy from "../Components/Settings/Pages/PrivacyPolicy";
import TermCondition from "../Components/Settings/Pages/TermCondition";
import InvestmentHistory from "../Components/Settings/Pages/InvestmentHistory";
import Referral from "../Components/Settings/Pages/Referral";
import FAQ from "../Components/Settings/Pages/FAQ";
import Profile from "../Components/Settings/Pages/Profile";
import bgImg from "../assets/bgImg.png";
import ReferralEarningsHistory from "../Components/Settings/Pages/ReferralEarningsHistory";
import DepositHistory from "../Components/Settings/Pages/DepositHistory";
import WithdrawUsdt from "../Components/Settings/Pages/WithdrawUsdt";
import WebProfile from "../Components/Settings/Pages/WebProfile";
import SwapDeposit from "../Components/Settings/Pages/SwapDeposit";

const Settings = () => {
  const location = useLocation();
  const [page, setPage] = useState("settings");

  // 🔥 URL sync
useEffect(() => {
  if (location.pathname.includes("privacy")) {
    setPage("privacy");
  } else if (location.pathname.includes("term-condition")) {
    setPage("TermCondition");
  } else if (location.pathname.includes("faqs")) {
    setPage("FAQ");
    } else if (location.pathname.includes("deposit-history")) {
    setPage("DepositHistory");
  } else if (location.pathname.includes("withdraw-usdt")) {
    setPage("WithdrawUsdt");
  } 
   else if (location.pathname.includes("AddFunds")) {
    setPage("AddFunds");
  }
  else if (location.pathname.includes("investment-history")) {
    setPage("InvestmentHistory");
  }
  else if (location.pathname.includes("referral-earning-history")) {
  setPage("ReferralEarningsHistory");
    }else if (location.pathname.includes("referral")) {
    setPage("Referral");}
    else if (location.pathname.includes("swap-deposit")) {
    setPage("SwapDeposit");}

// else if (location.pathname.includes("profile")) {
//     setPage("Profile");
//   }
  else if (location.pathname.includes("WebProfile")) {
    setPage("WebProfile");
  }
  else {
    setPage("settings");  
  }
}, [location.pathname]);

  return (
    <div className="pb-2" style={{ backgroundImage: `url(${bgImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>

      {page === "settings" && <SettingsComponent />}

      {page === "privacy" && <PrivacyPolicy />}
      {page === "withdrawUsdt" && <WithdrawUsdt />}
       {page === "FAQ" && <FAQ />}
      {page === "TermCondition" && <TermCondition />}
      {page === "InvestmentHistory" && <InvestmentHistory />}
      {page === "Referral" && <Referral />}
      {/* {page === "Profile" && <Profile />} */}
        {page === "WebProfile" && <WebProfile />}
      {page === "ReferralEarningsHistory" && <ReferralEarningsHistory />}
      {page === "DepositHistory" && <DepositHistory />}
      {page === "WithdrawUsdt" && <WithdrawUsdt />}
      {page === "SwapDeposit" && <SwapDeposit />}


      <Footer />
    </div>
  );
};

export default Settings;