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

it('calls displayModal if data retrieval fails when mounting', async () => {
  // mock 404 returned from any url matching /api/boards/*
  moxios.stubRequest(/api\/boards\/*/, {
    status: 404
  })
  const spy = jest.spyOn(BoardComponentOnly.prototype, 'displayModal');
  const wrapper = shallow(<BoardComponentOnly />);
  await flushPromises();
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
          { id: 0, task: 'first column first task' }
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
  expect(boardInstance.state.columns[0].cards.length).toBe(0);
  expect(boardInstance.state.columns[1].cards.length).toBe(1);
  expect(boardInstance.state.columns[1].cards[0].task).toBe('first column first task');
});

it('should reorder cards when reorderCardHandler is called', () => {
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

  const board = shallow(<Board />);
  const boardInstance = board.dive().instance();
  boardInstance.setState(state);
  boardInstance.reorderCardHandler(0, 0, 1);
  expect(boardInstance.state.columns[0].cards.length).toBe(2);
  expect(boardInstance.state.columns[0].cards[0].task).toBe('second task');
  expect(boardInstance.state.columns[0].cards[1].task).toBe('first task');
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

it('should display error modal if updateServerCardsFails', async () => {
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
  board.instance().updateServerCardsHandler(0, 0);
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

it('update card task when editCardHandler is called', async () => {
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
  board.instance().editCardHandler(0, 0, 'new task text');
  await flushPromises();
  board.update();
  expect(board.state().columns[0].cards[0].task).toEqual('new task text');
});

it('displays modal when editCardHandler call to server fails', async () => {
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
  board.instance().editCardHandler(0, 0, 'new task text');
  await flushPromises();
  board.update();
  expect(board.find(Modal).length).toEqual(1);
  expect(board.state().columns[0].cards[0].task).toEqual('original task');
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

