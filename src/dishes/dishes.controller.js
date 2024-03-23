const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

//Validation for all input fields
function allValidProps(req, res, next) {
  const validProps = ["name", "description", "price", "image_url"];
  const { data } = req.body;

  for (const name of validProps) {
    if (!data[name]) {
      return next({
        status: 400,
        message: `Dish must include ${name}.`,
      });
    }
  }
  return next();
}

//Read and update validations
function dishExists(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find((dish) => dish.id === dishId);

  if (foundDish) {
    res.locals.dish = foundDish;
    res.locals.dishId = dishId;
    return next();
  }

  next({
    status: 404,
    message: `Dish not found: ${dishId}.`,
  });
}

function priceNot0(req, res, next) {
  const { data: { price } = {} } = req.body;

  if (!Number.isInteger(price) || price <= 0) {
    return next({
      status: 400,
      message: "price",
    });
  }
  return next();
}

function priceIsNumber(req, res, next) {
  const { data } = req.body;

  if (data.price && data.price.length) {
    return next({
      status: 400,
      message: "Dish must include a valid price.",
    });
  }
}

function bodyMatchesRouteId(req, res, next) {
  const dishId = res.locals.dishId;
  const { data } = req.body;

  if (data.id && data.id !== dishId) {
    return next({
      status: 400,
      message: `Dish id (${data.id}) does not match route id (${dishId}).`,
    });
  }

  next();
}

//Route Handlers
function create(req, res) {
  const { data } = req.body;
  const newDish = {
    ...data,
    id: nextId(),
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

function read(req, res) {
  res.json({ data: res.locals.dish });
}

function list(req, res) {
  res.json({ data: dishes });
}

function update(req, res) {
  const dish = res.locals.dish;
  const { data } = req.body;

  const dishProperties = Object.getOwnPropertyNames(dish);

  for (let i = 0; i < dishProperties.length; i++) {
    let propName = dishProperties[i];
    if (dish[propName] !== data[propName]) {
      dish[propName] = data[propName];
    }
  }
  res.json({ data: dish });
}

module.exports = {
  create: [allValidProps, priceNot0, create],
  read: [dishExists, read],
  update: [dishExists, allValidProps, bodyMatchesRouteId, priceNot0, update],
  list: [list],
};
