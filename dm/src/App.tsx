import './App.css'
import { io } from "socket.io-client";

function App() {
  const URL = "http://localhost:3000";
  const socket = io(URL, { autoConnect: false });
  let usernameAlreadySelected:boolean = false;

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });

  const onUsernameSelection = (event:any) => {
    usernameAlreadySelected = true;
    const username:string = event.target.value;
    socket.auth = { username };
    socket.connect();
  }

  socket.on("connect_error", (err) => {
    if (err.message === "invalid username") {
      usernameAlreadySelected = false;
    }
  });

  return (
    <div className="App">
      <div className="select-username">
        <form onSubmit={onUsernameSelection}>
          <input placeholder='Your name'></input>
          <button>Send</button>
        </form>
      </div>
    </div>
  )
}

export default App
