import { useEffect, useRef } from "react";
import html2canvas from "html2canvas";

const SCREENSHOT_INTERVAL = 15 *60* 1000;
const FLAG_CHECK_INTERVAL = 50 * 1000;

function AutoScreenshot({ userId }: { userId: string }) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const flagCheckRef = useRef<NodeJS.Timeout | null>(null);
  const stoppedRef = useRef(false);

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const captureScreenshot = async () => {
    if (stoppedRef.current) return;

    try {
      const element = document.body;

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: isSafari,
        scale: window.devicePixelRatio || 2,
        backgroundColor: isSafari ? "#ffffff" : null,
        logging: false,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      const file = new File([blob], `screenshot_${Date.now()}.png`, {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:4040/upload-screenshot", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        console.warn("🛑 Unauthorized (401) — stopping screenshots");
        stoppedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        return;
      }

      if (!response.ok) {
        console.error("❌ Screenshot upload failed:", response.statusText);
        return;
      }

      console.log("✅ Screenshot uploaded successfully");
    } catch (err) {
      console.error("❌ Screenshot capture failed:", err);
    }
  };

  useEffect(() => {
    if (!userId) return;

    stoppedRef.current = false;

    // Start screenshot interval
    intervalRef.current = setInterval(captureScreenshot, SCREENSHOT_INTERVAL);
    captureScreenshot(); // initial capture

    // Flag check interval
    flagCheckRef.current = setInterval(() => {
      const active = localStorage.getItem("autoScreenshotActive") === "true";
      console.log(localStorage.getItem("autoScreenshotActive"));
      
      if (!active && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        stoppedRef.current = true;
        console.log("🛑 Screenshot stopped due to flag");
      } else if (active && userId && !intervalRef.current) {
        stoppedRef.current = false;
        intervalRef.current = setInterval(captureScreenshot, SCREENSHOT_INTERVAL);
        captureScreenshot();
        console.log("✅ Screenshot restarted due to flag");
      }
    }, FLAG_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (flagCheckRef.current) clearInterval(flagCheckRef.current);
    };
  }, [userId]);

  return null;
}

export default AutoScreenshot;


// import { useEffect, useRef } from "react";
// import html2canvas from "html2canvas";

// const SCREENSHOT_INTERVAL = 1 * 60 * 1000; // 15 minutes

// function AutoScreenshot({ userId }: { userId: string }) {
//   const intervalRef = useRef<NodeJS.Timeout | null>(null);

//   const captureScreenshot = async () => {
//   try {
//     const body = document.getElementById("root");
//     if (!body) return;

//     const canvas = await html2canvas(body, {
//       useCORS: true,
//       scale: 2, // sharp image
//       backgroundColor: null,
//       logging: false,
//       scrollY: -window.scrollY,
//     });

//     const blob = await new Promise<Blob | null>((resolve) =>
//       canvas.toBlob(resolve, "image/png")
//     );
//     if (!blob) return;

//     const file = new File([blob], `screenshot_${Date.now()}.png`, {
//       type: "image/png",
//     });

//     const formData = new FormData();
//     formData.append("file", file);

//     await fetch("http://localhost:4040/upload-screenshot", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${localStorage.getItem("token")}`,
//       },
//       body: formData,
//     });

//     console.log("Screenshot uploaded successfully");
//   } catch (err) {
//     console.error("Screenshot capture failed:", err);
//   }
// };


//   useEffect(() => {
//     captureScreenshot();
//     intervalRef.current = setInterval(captureScreenshot, SCREENSHOT_INTERVAL);

//     return () => {
//       if (intervalRef.current) clearInterval(intervalRef.current);
//     };
//   }, [userId]);

//   return null;
// }

// export default AutoScreenshot;
