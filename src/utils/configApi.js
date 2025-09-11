import axios from "axios";

export const addKioskSystemConfig = async ({
  BACKEND_URL,
  token,
  body,
  type = "device",
}) => {
  try {
    console.log({
      BACKEND_URL: `${BACKEND_URL}/add-kiosk-system-device-config`,
      token,
      body,
      type,
    });

    const response = await axios.post(
      `${BACKEND_URL}/kiosk/add-kiosk-system-device-config`,
      {
        type,
        config: body,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Add response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Add error:", error.response?.data || error.message);
    return error.response?.data || error.message;
  }
};
export const getKioskConfig = async ({ BACKEND_URL, token }) => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/kiosk/get-kiosk-system-device-config`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("Get response:", response.data);

    return response.data;
  } catch (error) {
    console.error("Get error:", error.response?.data || error.message);
  }
};

// export const updateKiosMediaDeviceConfig=async({ id,token, body })=> {
//   try {
//   const response = await axios.patch(
//       "http://localhost:5500/kiosk/update-kiosk-system-device-config/68bad46c74642ff5ee2533e0",
//       {
//         type: "system",
//         config: body,
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     console.log("Add response:", response.data);
//   } catch (error) {
//     console.error("Add error:", error.response?.data || error.message);
//   }
// }

// ipcMain.handle("get-device-config", async () => {
//   const token = store.get("authToken") || null;
//   const system = store.get("systemConfiguration") || null;
//   const device = store.get("deviceConfiguration") || null;

//   const BACKEND_URL =
//     env === "staging"
//       ? process.env.STAGING_BACKEND_URL
//       : process.env.PROD_BACKEND_URL;
//   // const res = await addKioskSystemConfig({ BACKEND_URL, body: system, token });
//   const res = await getKioskConfig({ BACKEND_URL, token });
//   console.log({ res });

//   const deviceConfig = {
//     device, // deviceId of camera
//     system, // deviceId of microphone
//   };
//   return deviceConfig;
// });
