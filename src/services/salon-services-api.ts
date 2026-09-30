import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const SERVICE_ITEMS_API_URL = `${API_URL}saloon/service-items/`;

const getToken = () => {
    const cashier = localStorage.getItem("cashier")
        ? JSON.parse(localStorage.getItem("cashier") as string)
        : null;

    return cashier ? cashier.token : null;
};

export const getServiceItems = async () => {
    try {
        const response = await axios.get(SERVICE_ITEMS_API_URL, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const createServiceItem = async (serviceData: FormData) => {
    try {
        const response = await axios.post(SERVICE_ITEMS_API_URL, serviceData, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateServiceItem = async (id: string, serviceData: FormData) => {
    try {
        const response = await axios.put(
            `${SERVICE_ITEMS_API_URL}${id}`,
            serviceData,
            {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    "Content-Type": "multipart/form-data",
                },
            },
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteServiceItem = async (id: string) => {
    try {
        const response = await axios.delete(`${SERVICE_ITEMS_API_URL}${id}`, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
