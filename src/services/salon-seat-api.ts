import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const SALON_API_URL = `${API_URL}saloon/saloons/`;

const getToken = () => {
    const cashier = localStorage.getItem("cashier")
        ? JSON.parse(localStorage.getItem("cashier") as string)
        : null;

    return cashier ? cashier.token : null;
};

export const createSalonSeat = async (seatData: any) => {
    try {
        const response = await axios.post(SALON_API_URL, seatData, {
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

export const getSalonSeatList = async () => {
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

export const updateSalonSeat = async (seatId: string, seatData: any) => {
    try {
        const response = await axios.put(`${SALON_API_URL}${seatId}/`, seatData, {
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

export const deleteSalonSeat = async (seatId: string) => {
    try {
        const response = await axios.delete(`${SALON_API_URL}${seatId}/`, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}