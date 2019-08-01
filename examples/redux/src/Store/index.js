// tslint:disable:no-any
import { applyMiddleware, compose, createStore } from "redux";

import rootReducer from "./reducer";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

let store;

export const configureStore = () => {
  store = createStore(rootReducer);

  return store;
};

export const getStore = () => store;
