// react imports
import React, { Component } from 'react';

// project imports
import Board, { BoardComponentOnly } from './Board';
import Column from '../Column/Column';
import Spinner from '../../components/Spinner/Spinner';
import Modal from '../../components/Modal/Modal';
import CardCrud from '../../components/CardCrud/CardCrud';

// 3rd party imports
import TestBackend from 'react-dnd-test-backend';
import { DragDropContext } from 'react-dnd';
import { configure, shallow, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import moxios from 'moxios'

configure({ adapter: new Adapter() });

beforeEach(function () {
  // mock axios calls to the server
  moxios.install();
})

afterEach(function () {
  moxios.uninstall();
})

function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

// Wraps a component in a DragDropContext that uses the dnd TestBackend.
function wrapInTestContext(DecoratedComponent) {
  return DragDropContext(TestBackend)(
    class TestContextContainer extends Component {
      render() {
        return <DecoratedComponent {...this.props} />;
      }
    }
  );
}

it('only displays a spinner when mounted (ie: retrieving data)', () => {
  const board = shallow(<BoardComponentOnly />);
  expect(board.find(Column).length).toEqual(0);
  expect(board.find(Spinner).length).toEqual(1);
});

it('calls retrieveData when mounted', () => {
  const spy = jest.spyOn(BoardComponentOnly.prototype, 'retrieveData');
  const wrapper = shallow(<BoardComponentOnly />);
  expect(spy).toHaveBeenCalledTimes(1);
});

it('should have column instance when not retrieving data', () => {
  const state = {
    retrieving_data: false,
    columns: [
      {
        id: 0,
        name: 'first column',
        cards: [
          { id: 0, task: 'first column first task' }
        ]
      }
    ]
  };

  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  board.update();
  expect(board.find(Column).length).toEqual(1);
  expect(board.find(Spinner).length).toEqual(0);
});

it('should move card when moveCardHandler is called', () => {
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        cards: [
          {
            id: 0, task: 'first column first task',
            position_id: 0, column_id: 0
          },
          {
            id: 1, task: 'first column second task',
            position_id: 1, column_id: 0
          }
        ]
      }, {
        id: 1,
        name: 'second column',
        cards: []
      }
    ]
  };

  const board = shallow(<Board />);
  const boardInstance = board.dive().instance();
  boardInstance.setState(state);
  boardInstance.moveCardHandler(0, 0, 1);
  expect(boardInstance.state.columns[0].cards.length).toBe(1);
  expect(boardInstance.state.columns[1].cards.length).toBe(1);
  expect(boardInstance.state.columns[1].cards[0].task).toBe('first column first task');
  expect(boardInstance.state.columns[1].cards[0].position_id).toBe(0);
  expect(boardInstance.state.columns[1].cards[0].column_id).toBe(1);
});

it('should reorder cards when reorderCardHandler is called while hovering', () => {
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        cards: [
          { id: 0, task: 'first task', position_id: 0 },
          { id: 1, task: 'second task', position_id: 1 }
        ]
      }
    ]
  };
  const args = {
    hasDropped: false,
    columnIndex: 0,
    fromCardIndex: 0,
    toCardIndex: 1
  };
  const board = shallow(<Board />);
  const boardInstance = board.dive().instance();
  boardInstance.setState(state);
  boardInstance.reorderCardHandler(args);
  expect(boardInstance.state.columns[0].cards.length).toBe(2);
  expect(boardInstance.state.columns[0].cards[0].task).toBe('second task');
  expect(boardInstance.state.columns[0].cards[1].task).toBe('first task');
});

it('should call patchServerCards when reorderCardHandler on card drop', () => {
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        cards: [
          { id: 0, task: 'first task', position_id: 0 },
          { id: 1, task: 'second task', position_id: 1 }
        ]
      }
    ]
  };
  const args = {
    hasDropped: true,
    columnIndex: 0,
    toCardIndex: 1
  };

  // use wrapper to allow jest to spy on what is actually an arrow function
  const patchServerCards = jest.fn();
  class BoardWrapper extends BoardComponentOnly {
    constructor(props) {
      super(props);
      this.patchServerCards = patchServerCards;
    }
  }

  const board = shallow(<BoardWrapper />);
  const boardInstance = board.instance();
  boardInstance.setState(state);
  boardInstance.reorderCardHandler(args);
  expect(patchServerCards).toHaveBeenCalledTimes(1);
});

it('should toggle column.collapsed when toggleColumnHandler is called', () => {
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: [
          { id: 0, task: 'first task' }
        ]
      }
    ]
  };

  const board = shallow(<Board />);
  const boardInstance = board.dive().instance();
  boardInstance.setState(state);
  boardInstance.toggleColumnHandler(0);
  expect(boardInstance.state.columns[0].collapsed).toBeTruthy();
});

it('should display error modal if patchServerCards Fails', async () => {
  moxios.stubRequest('/api/cards/', {
    status: 404
  })
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: [{ id: 0, task: 'original task', position_id: 0 }]
      }
    ]
  };
  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  board.instance().patchServerCards(0);
  await flushPromises();
  board.update();
  expect(board.find(Modal).length).toEqual(1);
});

it('toggles CardCrud component when toggleCardCrudHandler is called', () => {
  const state = {
    retrieving_data: false,
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: [
          { id: 0, task: 'first task' }
        ]
      }
    ]
  };
  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  // initially there is no modal
  expect(board.find(CardCrud).length).toBe(0);

  // display modal
  board.instance().toggleCardCrudHandler(true, 0);
  board.update();
  expect(board.find(CardCrud).length).toBe(1);

  // close modal
  board.instance().toggleCardCrudHandler(false);
  board.update();
  expect(board.find(CardCrud).length).toBe(0);
});

it('deletes card from state when deleteCardHandler is called with valid card', () => {
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: [
          { id: 0, task: 'first task' }
        ]
      }
    ]
  };
  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  board.instance().deleteCardHandler(0, 0);
  board.update();
  expect(board.state().columns[0].cards.length).toBe(0);
});

it('update card task when editCardDetailHandler is called', async () => {
  moxios.stubRequest(/api\/cards\/*/, {
    status: 200,
    response: {
      task: 'new task text',
      id: 0,
      position_id: 0
    }
  })
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: [{ id: 0, task: 'first task', position_id: 0 }]
      }
    ]
  };
  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  board.instance().editCardDetailHandler(0, 0, 'new task text');
  await flushPromises();
  board.update();
  expect(board.state().columns[0].cards[0].task).toEqual('new task text');
});

it('displays modal when editCardDetailHandler call to server fails', async () => {
  moxios.stubRequest(/api\/cards\/*/, {
    status: 404
  })
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: [{ id: 0, task: 'original task' }]
      }
    ]
  };
  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  board.instance().editCardDetailHandler(0, 0, 'new task text');
  await flushPromises();
  board.update();
  expect(board.find(Modal).length).toEqual(1);
});

it('create new card when createCardHandler is called with valid card', () => {
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: []
      }
    ]
  };
  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  board.instance().createCardHandler(0, 'new task');
  board.update();
  expect(board.state().columns[0].cards.length).toBe(1);
  expect(board.state().columns[0].cards[0].task).toEqual('new task');
});

it('should merge previous state if patchServerCards fails', async () => {
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: [{ id: 0, task: 'first task', position_id: 0 }]
      }
    ],
    previousState: {
      value: 'fake previous state value'
    }
  };
  moxios.stubRequest('/api/cards/', {
    status: 404,
    response: {}
  })
  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  expect(board.state().value).toBeUndefined();
  board.instance().patchServerCards([]);
  await flushPromises();
  expect(board.state().value).toEqual('fake previous state value');
});

it('should merge previous state if patchServerCardDetail fails', async () => {
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: [{ id: 0, task: 'first task', position_id: 0 }]
      }
    ],
    previousState: {
      value: 'fake previous state value'
    }
  };
  moxios.stubRequest('/api/cards/0/', {
    status: 404,
    response: {}
  })
  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  expect(board.state().value).toBeUndefined();
  board.instance().patchServerCardDetail(0, 0);
  await flushPromises();
  expect(board.state().value).toEqual('fake previous state value');
});

it('should merge previous state if postServerCard fails', async () => {
  const state = {
    columns: [
      {
        id: 0,
        name: 'first column',
        collapsed: false,
        cards: []
      }
    ],
    previousState: {
      value: 'fake previous state value'
    }
  };
  moxios.stubRequest('/api/cards/', {
    status: 400,
    response: {}
  })
  const new_card = {
    id: -1,
    spinner: true,
    task: 'test task',
    column_id: 0,
    position_id: 0
  }
  const board = shallow(<BoardComponentOnly />);
  board.setState(state);
  expect(board.state().value).toBeUndefined();
  board.instance().postServerCard(0, new_card);
  await flushPromises();
  expect(board.state().columns[0].cards.length).toBe(0);
  expect(board.state().value).toEqual('fake previous state value');
});