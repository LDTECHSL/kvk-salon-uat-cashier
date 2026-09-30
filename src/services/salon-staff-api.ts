import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const SALON_API_URL = `${API_URL}saloon/staff/`;

const getToken = () => {
    const cashier = localStorage.getItem("cashier")
        ? JSON.parse(localStorage.getItem("cashier") as string)
        : null;

    return cashier ? cashier.token : null;
};

export const createStaff = async (staffData: any) => {
    try {
        const response = await axios.post(SALON_API_URL, staffData, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getStaffList = async () => {
    try {
        const response = await axios.get(SALON_API_URL, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const updateStaff = async (staffId: string, staffData: any) => {
    try {
        const response = await axios.put(`${SALON_API_URL}${staffId}/`, staffData, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const deleteStaff = async (staffId: string) => {
    try {
        const response = await axios.delete(`${SALON_API_URL}${staffId}/`, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}