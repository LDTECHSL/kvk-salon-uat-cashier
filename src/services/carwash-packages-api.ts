import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const CAR_API_URL = `${API_URL}car-service/package/`;

const getToken = () => {
  const cashier = localStorage.getItem("cashier")
    ? JSON.parse(localStorage.getItem("cashier") as string)
    : null;

  return cashier ? cashier.token : null;
};


export const getCarPackages = async () => {
  try {
    const token = getToken();
    const response = await axios.get(`${CAR_API_URL}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createCarPackage = async (serviceData: FormData) => {
  try {
    const token = getToken();
    const response = await axios.post(`${CAR_API_URL}`, serviceData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateCarPackage = async (serviceData: FormData) => {
  try {
    const token = getToken();
    const response = await axios.put(`${CAR_API_URL}`, serviceData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export const deleteCarPackage = async (serviceId: string) => {
  try {
    const token = getToken();
    const response = await axios.delete(`${CAR_API_URL}${serviceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllCarPackages = async () => {
  try {
    const token = getToken();
    const response = await axios.get(`${CAR_API_URL}with-services`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};