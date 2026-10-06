import React from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'
export default function LandingPage() {


    const router = useNavigate();

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>Apna Video Call</h2>
                </div>
                <div className='navlist'>
                    <p onClick={() => {
                        router("/aljk23")
                    }}>Join as Guest</p>
                    <p onClick={() => {
                        router("/auth")

                    }}>Register</p>
                    <div onClick={() => {
                        router("/auth")

                    }} role='button'>
                        <p>Login</p>
                    </div>
                </div>
            </nav>


            <div className="landingMainContainer">
                <div>
                    <h1 style={{ backgroundColor: "rgba(255, 249, 249, 0.4)", padding: "20px", borderRadius:"0 30px 0 30px" }}><span style={{ color: "#f31909ff" }}>Connect</span> with your loved Ones</h1>
                    <br/>
                   <p style={{ color: "#178630ff" ,fontWeight: "600",backgroundColor: "rgba(255, 249, 249, 0.4)", padding: "20px", borderRadius:"0px 30px 0px 30px", width: "650px" }}>
  Cover a distance by Apna Video Call
</p>


                    <div role='button'>
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                
            </div>



        </div>
    )
}
