
import '../../assets/styles/modalEmail.css';
export default function ModalEmail(){
    return(
        <>
           <div className='modal modal-email'>
                <b id='closeModal' onClick={() => location.reload()}>&times;</b>
                <img src='/src/assets/images/modal/verification.png' />
                <div className='subtext'>
                    <h2>Verification Link Send To Email!</h2>
                    {/* <p>Yahoo!You Have Successfully verified the account.</p> */}
                    <p>Please, Check Your Email For Verification!.</p>
                </div>
           </div>
        </>
    )
}