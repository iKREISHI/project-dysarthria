import axios from "axios";

const BASE_URL = process.env.REACT_APP_BASE_URL;
const getCSRFToken = () => {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken'))
      ?.split('=')[1];
    return cookieValue;
  };
  const axiosConfig = axios.create({
    baseURL: BASE_URL,
    headers: {
        'X-CSRFToken': getCSRFToken(),
        'Content-Type': 'application/json',
      },
      withCredentials: true,
  });

  export default axiosConfig;
