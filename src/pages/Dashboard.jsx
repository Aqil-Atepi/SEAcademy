


export default function Dashboard(){
    return(
        <>
          <h1>Selamat Datang ,{check()}</h1>
        </>
    )
}

function check(){
  const name = localStorage.getItem('name');
  if(!name || name.length <= 0){
    return location.href = '/login'
  }
  return name;
}