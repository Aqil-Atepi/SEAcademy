import { useState } from 'react';
import '../assets/styles/Background.css'
import '../assets/styles/Login.css'

import getApi from "../utils/index.js";




export default function Login(){


    return(
        <>
            <form onSubmit= {e => {
                e.preventDefault();
                loginUser(e)
            }}>
                <span>SEAcademy</span>
                <input type="email" className="input-email" placeholder="Enter Email"/>
                <input type="password" className="input-password" placeholder="Enter Password"/>
                <button type="submit">Log-In</button>
            </form>
        </>
    )
}

async function loginUser(e){

    const email = e.target[0].value;
    const password = e.target[1].value;

    console.log(email,password)
    const api = await getApi().post('/auth/signin',{
        email : email,
        password : password
    })

    if(api.status === 200){
        localStorage.setItem('name',api.data?.name)
    }

    console.log(api)


}