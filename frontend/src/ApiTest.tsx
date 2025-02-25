import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/";

function ApiTest() {
  const [message, setMessage] = useState("");

  console.log("hi")
  console.log(`the api url is: ${API_URL}`)

  useEffect(() => {
    fetch(API_URL)
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return <div>{message ? message : "Loading..."}</div>;
}

export default ApiTest;