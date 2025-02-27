import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function ApiTest() {
  const [message, setMessage] = useState("");
  console.log(`the api url is: ${API_URL}`)
  console.log(`the api I am trying to call is: ${API_URL+"/test"}`)

  useEffect(() => {
    fetch(API_URL+"/test")
      .then((response) => {
        console.log("Response received:", response);
        return response.json();
      })
      .then((data) => {
        console.log("Data parsed:", data);
        if (data.message) {
          setMessage(data.message);
        } else {
          console.error("Response does not contain 'message':", data);
        }
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return <div>{message ? message : "Loading..."}</div>;
}

export default ApiTest;