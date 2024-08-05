import axios from "axios";

export default function getApi(){
    const api = axios.create({
        baseURL : 'http://localhost:3000/v1'
    })

    return api;

}