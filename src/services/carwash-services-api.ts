import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const CAR_API_URL = `${API_URL}car-service/wash-service/`;

const getToken = () => {
  const cashier = localStorage.getItem("cashier")
    ? JSON.parse(localStorage.getItem("cashier") as string)
    : null;

  return cashier ? cashier.token : null;
};

export const getCarServices = async () => {
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

export const createCarService = async (serviceData: FormData) => {
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

export const updateCarService = async (serviceData: FormData) => {
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

export const deleteCarService = async (serviceId: string) => {
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