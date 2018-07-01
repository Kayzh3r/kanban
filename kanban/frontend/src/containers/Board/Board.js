// react imports
import React, { Component, Fragment } from 'react';

// project imports
import Column from '../Column/Column';
import CreateColumnModal from '../../components/Modals/ColumnCreateUpdate';
import Spinner from '../../components/Spinner/Spinner';
import Info from '../../components/Modals/Info';
import Confirm from '../../components/Modals/Confirm';
import Button from '../../components/UI/Button';
import { connect } from 'react-redux';
import * as actions from './actions';

// 3rd party imports
import styled from 'styled-components';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import axios from 'axios';
import PropTypes from 'prop-types';

const propTypes = {
  id: PropTypes.number.isRequired,
  authToken: PropTypes.string.isRequired
};

const BoardContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  margin: 10px;
  background-color: #c3d9e8;
  border-radius: 2px;
`;

const ColumnsContainer = styled.div`
  display: flex;
  flex: 1;
`;

class Board extends Component {
  state = {
    confirmModal: {
      message: null,
      confirmFunction: null
    },
    createColumnModal: false,
    cardCreateUpdate: {
      active: false,
      columnIndex: -1,
      cardIndex: -1
    },
    previousState: {}
  };

  // set auth token and retrieve data on initial mount
  componentDidMount() {
    axios.defaults.headers.common['Authorization'] = `JWT ${
      this.props.authToken
    }`;
    this.props.getBoard(this.props.id);
  }

  // called when the props change (eg: a different boardId was selected)
  static getDerivedStateFromProps(nextProps, prevState) {
    return { ...nextProps };
  }

  // if board id has changed, dispatch getBoard to retrieve data from server
  componentDidUpdate(prevProps, prevState) {
    if (prevState.id !== this.props.id) {
      this.props.getBoard(this.props.id);
    }
  }

  // make a deep copy of the entire state and save it to state.previousState
  savePreviousState = () => {
    const currentState = { ...this.state };
    for (let column in this.state.columns) {
      currentState.columns[column] = { ...this.state.columns[column] };
      currentState.columns[column].cards = [
        ...this.state.columns[column].cards
      ];
      for (let card in this.state.columns[column].cards) {
        currentState.columns[column].cards[card] = {
          ...this.state.columns[column].cards[card]
        };
      }
    }
    delete currentState.previousState;
    this.setState({ previousState: currentState });
  };

  // update all specified cards.
  // optionally display a card spinner if a spinnerCard is provided
  patchServerCards = async (cards, spinnerCard) => {
    if (spinnerCard) this.toggleCardSpinner(spinnerCard[0], spinnerCard[1]);
    await axios
      .patch(`/api/cards/`, { cards })
      .then(res => {
        if (spinnerCard) this.toggleCardSpinner(spinnerCard[0], spinnerCard[1]);
        this.savePreviousState();
      })
      //restore previous valid state and display error message
      .catch(error => {
        const previousState = this.state.previousState;
        this.setState(previousState);
        const message = 'Error: Unable to update cards on the server';
        this.toggleInfoHandler(message);
      });
  };

  // Update single card detail on the server
  patchServerCardDetail = async (columnIndex, cardIndex) => {
    this.toggleCardSpinner(columnIndex, cardIndex);
    const card = { ...this.state.columns[columnIndex].cards[cardIndex] };
    await axios
      .patch(`/api/cards/${card.id}/`, { ...card })
      .then(res => {
        this.toggleCardSpinner(columnIndex, cardIndex);
        this.savePreviousState();
      })
      // restore previous valid state and display error message
      .catch(error => {
        const previousState = this.state.previousState;
        this.setState(previousState);
        const message = 'Error: Unable to update card on the server';
        this.toggleInfoHandler(message);
      });
  };

  // reorder cards within a column
  reorderCardHandler = ({
    hasDropped,
    columnIndex,
    fromCardIndex,
    toCardIndex
  }) => {
    // deep copy single column with all of its cards
    const column = { ...this.state.columns[columnIndex] };
    column.cards = [...this.state.columns[columnIndex].cards];
    for (let card in this.state.columns[columnIndex].cards) {
      column.cards[card] = { ...this.state.columns[columnIndex].cards[card] };
    }

    // card has been dropped, update column on the server
    if (hasDropped) {
      const spinnerCard = [columnIndex, toCardIndex];
      this.patchServerCards(column.cards, spinnerCard);
    } else {
      // card hasn't been dropped yet, update local column state only
      // reorder card
      const card = column.cards.splice(fromCardIndex, 1)[0];
      column.cards.splice(toCardIndex, 0, card);

      // update position_ids
      for (let key in column.cards) {
        column.cards[key]['position_id'] = parseInt(key, 10);
      }

      this.setState({
        columns: [
          ...this.state.columns.slice(0, columnIndex),
          column,
          ...this.state.columns.slice(columnIndex + 1)
        ]
      });
    }
  };

  // move card to a different column
  moveCardHandler = (fromColumnIndex, fromCardIndex, toColumnIndex) => {
    // create deep copy of all columns
    const updatedState = { columns: [...this.state.columns] };
    for (let column in updatedState.columns) {
      updatedState.columns[column] = { ...this.state.columns[column] };
      updatedState.columns[column].cards = [
        ...this.state.columns[column].cards
      ];
      for (let card in this.state.columns[column].cards) {
        updatedState.columns[column].cards[card] = {
          ...this.state.columns[column].cards[card]
        };
      }
    }

    // remove card from fromColumnIndex
    const card = updatedState.columns[fromColumnIndex].cards.splice(
      fromCardIndex,
      1
    )[0];

    // update card column_id and position_id
    card.column_id = updatedState.columns[toColumnIndex].id;
    card.position_id = updatedState.columns[toColumnIndex].cards.length;

    // push card to toColumnIndex
    updatedState.columns[toColumnIndex].cards.push(card);

    // update card position ids in fromColumnIndex
    for (let key in updatedState.columns[fromColumnIndex].cards) {
      updatedState.columns[fromColumnIndex].cards[key][
        'position_id'
      ] = parseInt(key, 10);
    }

    // update state
    this.setState({ columns: updatedState.columns });

    // update server with changed cards, ie: moved card and cards in fromColumn
    const newCardIndex = updatedState.columns[toColumnIndex].cards.length - 1;
    const cards = [...updatedState.columns[fromColumnIndex].cards];
    cards.push(updatedState.columns[toColumnIndex].cards[newCardIndex]);
    const spinnerCard = [toColumnIndex, newCardIndex];
    this.patchServerCards(cards, spinnerCard);
  };

  toggleCreateColumnModal = () => {
    this.setState({ createColumnModal: !this.state.createColumnModal });
  };

  handleCreateColumn = name => {
    const column = {
      name: name,
      id: -1,
      position_id: this.props.columnIds.length,
      board_id: this.props.id,
      cards: [],
      spinner: true
    };
    this.toggleCreateColumnModal();
    this.props.createColumn(column);
  };

  // edit existing card on the server and update local state
  editCardDetailHandler = (columnIndex, cardIndex, task) => {
    this.toggleCardCreateUpdateHandler(false);

    const card = { ...this.state.columns[columnIndex].cards[cardIndex] };
    card.task = task;

    this.setState(
      {
        columns: [
          ...this.state.columns.slice(0, columnIndex),
          {
            ...this.state.columns[columnIndex],
            cards: [
              ...this.state.columns[columnIndex].cards.slice(0, cardIndex),
              { ...card },
              ...this.state.columns[columnIndex].cards.slice(cardIndex + 1)
            ]
          },
          ...this.state.columns.slice(columnIndex + 1)
        ]
      },
      // call back function executed after setState completes
      () => this.patchServerCardDetail(columnIndex, cardIndex)
    );
  };

  // display / hide info modal with message
  toggleInfoHandler = (message = null) => {
    this.setState({ infoModal: message });
  };

  // display / hide confirm modal. Specify function and params to be executed
  // if confirm is clicked
  toggleConfirmHandler = (message, confirmFunction, params) => {
    let confirmModal;
    if (message) {
      confirmModal = {
        message: message,
        confirmFunction: () => confirmFunction(params)
      };
    } else {
      confirmModal = {
        message: null,
        confirmFunction: null
      };
    }
    this.setState({ confirmModal: confirmModal });
  };

  render() {
    let output = <Spinner />;
    if (!this.props.retrievingData) {
      const columns = this.props.columnIds.map(columnId => {
        return <Column key={columnId} id={columnId} />;
      });

      let createColumnModal = null;
      if (this.state.createColumnModal) {
        createColumnModal = (
          <CreateColumnModal
            toggleModal={this.toggleCreateColumnModal}
            createColumn={name => this.handleCreateColumn(name)}
          />
        );
      }

      output = (
        <BoardContainer>
          <div>
            <Button domProps={{ onClick: this.toggleCreateColumnModal }}>
              Create Column
            </Button>
          </div>
          <ColumnsContainer>
            {createColumnModal}
            {columns}
          </ColumnsContainer>
        </BoardContainer>
      );
    }

    let infoModal = null;
    if (this.props.infoModal) {
      infoModal = (
        <Info
          message={this.props.infoModal}
          toggleInfo={this.props.toggleInfoModal}
        />
      );
    }

    // display / hide confirmation modal
    let confirmModal = null;
    if (this.state.confirmModal.message) {
      confirmModal = (
        <Confirm
          message={this.state.confirmModal.message}
          confirmFunction={this.state.confirmModal.confirmFunction}
          toggleConfirm={this.toggleConfirmHandler}
        />
      );
    }

    return (
      <Fragment>
        {infoModal}
        {confirmModal}
        {output}
      </Fragment>
    );
  }
}

Board.propTypes = propTypes;

const mapStateToProps = state => {
  return {
    authToken: state.auth.token,
    id: state.home.selectedBoardId,
    columnIds: state.board.columns,
    retrievingData: state.board.retrievingData,
    infoModal: state.board.infoModal
  };
};

const mapDispatchToProps = dispatch => {
  return {
    getBoard: id => dispatch(actions.getBoard(id)),
    toggleInfoModal: message => dispatch(actions.toggleInfoModal(message)),
    createColumn: column => dispatch(actions.createColumn(column))
  };
};

export const BoardComponentOnly = Board; // used for shallow unit testing
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DragDropContext(HTML5Backend)(Board));
