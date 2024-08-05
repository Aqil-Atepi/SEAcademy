import '../assets/styles/Background.css'
import '../assets/styles/Login.css'

import { useState } from 'react';

import getApi from "../utils/index.js";
import ModalEmail from "./components/ModalEmail.jsx";

export default function Register(){

    const [htmlTag,setHtmlTag] = useState(
        <form onSubmit= {e => {
            e.preventDefault();
            const form_element = e.target
            loginUser(form_element,setHtmlTag);
            // setHtmlTag(<ModalEmail/>);
        }}>
            <span>SEAcademy</span>
            <input type="username" className="input-email input-username" placeholder="Enter Username" minLength={3} required/>
            <input type="email" className="input-email" placeholder="Enter Email" required/>
            <input type="password" className="input-password" placeholder="Enter Password" minLength={8} required/>
            <button type="submit">Resgiter</button>
        </form>
    );

    return(
        <>
            {htmlTag}
        </>
    )
}

async function loginUser(elementForm,setHtmlTag){
    const name = elementForm[0].value;
    const email = elementForm[1].value;
    const password = elementForm[2].value;
   
    
    const api = await getApi().post('/auth/signup',{
        name : name,
        email : email,
        password : password 
    })

    // console.log(ap)

    if(api?.status === 204){
        setHtmlTag(<ModalEmail/>)
    }




}