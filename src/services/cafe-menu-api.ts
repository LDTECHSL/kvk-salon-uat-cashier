import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const CAFE_API_URL = `${API_URL}cafe/menu/`;

const getToken = () => {
    const cashier = localStorage.getItem("cashier")
        ? JSON.parse(localStorage.getItem("cashier") as string)
        : null;

    return cashier ? cashier.token : null;
};

export const createMenuItem = async (menuItemData: FormData) => {
    try {
        const response = await axios.post(CAFE_API_URL, menuItemData, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const updateMenuItem = async (menuItemData: FormData) => {
    try {
        const response = await axios.put(CAFE_API_URL, menuItemData, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const deleteMenuItem = async (menuItemId: string) => {
    try {
        const response = await axios.delete(`${CAFE_API_URL}${menuItemId}`, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMenuItems = async (category: any) => {
    try {
        const response = await axios.get(`${CAFE_API_URL}category/${category}`, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};