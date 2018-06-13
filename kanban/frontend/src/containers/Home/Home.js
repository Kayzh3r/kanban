// react imports
import React, { Component } from "react";

// project imports
import Info from "../../components/Modals/Info";
import Board from "../Board/Board";
import Select from "../../components/UI/Select";
import Button from "../../components/UI/Button";
import BoardCreateUpdate from "../../components/Modals/BoardCreateUpdate";

// 3rd party imports
import styled from "styled-components";
import jwtDecode from "jwt-decode";
import axios from "axios";

const HomeContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  background-color: green;
`;

class Home extends Component {
  state = {
    infoModal: false,
    boardCreateUpdate: {
      active: false,
      name: null
    },
    authToken: null,
    availableBoards: {},
    selectedBoardId: null // database board id of the selected board
  };

  componentDidMount() {
    if (this.isLoggedIn()) this.retrieveData();
    else this.props.history.push("/auth");
  }

  // if authToken exists and has not expired, user is considered logged in
  isLoggedIn() {
    const authToken = localStorage.getItem("authToken");
    if (authToken) {
      const decodedToken = jwtDecode(authToken);
      if (new Date() <= new Date(decodedToken.exp * 1000)) {
        axios.defaults.headers.common["Authorization"] = `JWT ${authToken}`;
        this.setState({ authToken: authToken });
        return true;
      }
    }
    return false;
  }

  // retrieve available user boards from the server
  async retrieveData() {
    await axios
      .get("/api/boards/")
      .then(res => {
        this.setState({ availableBoards: res.data });
      })
      .catch(error => {
        const message = "Error: Unable to load board data";
        this.toggleInfoHandler(message);
      });
  }

  // display / hide info modal with message
  toggleInfoHandler = (message = null) => {
    this.setState({ infoModal: message });
  };

  // update state: selectedBoardId
  selectBoard = id => {
    this.setState({ selectedBoardId: parseInt(id, 10) });
  };

  // create a new board
  createBoardHandler = name => {
    this.toggleBoardCreateUpdateHandler();
    axios
      .post("/api/boards/", { name: name })
      .then(res => {
        const availableBoards = { ...this.state.availableBoards };
        availableBoards[res.data.id] = res.data.name;
        this.setState({
          availableBoards: availableBoards,
          selectedBoardId: res.data.id
        });
      })
      .catch(error => {
        const message = "Error: Unable to create board";
        this.toggleInfoHandler(message);
      });
  };

  // change the boards name
  updateBoardHandler = name => {
    this.toggleBoardCreateUpdateHandler();
    if (name !== this.state.availableBoards[this.state.selectedBoardId]) {
      console.log(name);
    }
  };

  // used to display / hide boardCreateUpdate modal
  toggleBoardCreateUpdateHandler = update => {
    const name = update
      ? this.state.availableBoards[this.state.selectedBoardId]
      : null;

    const boardCreateUpdate = {
      active: !this.state.boardCreateUpdate.active,
      name: name
    };

    this.setState({ boardCreateUpdate: boardCreateUpdate });
  };

  render() {
    let infoModal = null;
    if (this.state.infoModal) {
      infoModal = (
        <Info
          message={this.state.infoModal}
          toggleInfo={this.toggleInfoHandler}
        />
      );
    }

    // display modal if this.state.boardCreateUpdate.active == true
    let boardCreateUpdate = null;
    if (this.state.boardCreateUpdate.active) {
      boardCreateUpdate = (
        <BoardCreateUpdate
          name={this.state.boardCreateUpdate.name}
          toggleBoardCreateUpdate={this.toggleBoardCreateUpdateHandler}
          createBoard={this.createBoardHandler}
          updateBoard={this.updateBoardHandler}
        />
      );
    }

    const board =
      this.state.authToken && this.state.selectedBoardId ? (
        <Board
          authToken={this.state.authToken}
          id={this.state.selectedBoardId}
        />
      ) : null;

    let editBoardButton = null;
    if (this.state.selectedBoardId) {
      editBoardButton = (
        <Button clicked={() => this.toggleBoardCreateUpdateHandler(true)}>
          Edit Board Name
        </Button>
      );
    }

    return (
      <HomeContainer>
        {infoModal}
        {boardCreateUpdate}
        <Select
          onChangeFunc={this.selectBoard}
          options={this.state.availableBoards}
          selectedValue={this.state.selectedBoardId || -1}
        />
        <Button clicked={() => this.toggleBoardCreateUpdateHandler()}>
          Create Board
        </Button>
        {editBoardButton}
        {board}
      </HomeContainer>
    );
  }
}

export default Home;
