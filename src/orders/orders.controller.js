const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

function allValidProperties(req, res, next) {
  const validProps = ["deliverTo", "mobileNumber", "dishes"];
  const { data } = req.body;

  for (const name of validProps) {
    if (!data[name]) {
      return next({
        status: 400,
        message: `Order must include ${name}.`,
      });
    }
  }
  return next();
}

function hasDishes(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (Array.isArray(dishes) && dishes.length !== 0) return next();

  return next({
    status: 400,
    message: "Order must include at least one dish.",
  });
}

function hasDishQuantity(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  let isValid = true;

  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    if (
      !dish.quantity ||
      dish.quantity < 1 ||
      !Number.isInteger(dish.quantity)
    ) {
      isValid = false;
      return next({
        status: 400,
        message: `Dish at index ${i} must have a quantity that is an integer greater than 0.`,
      });
    }
  }
  return next();
}

function orderExists(req, res, next) {
  const { orderId } = req.params;

  const foundOrder = orders.find((order) => order.id === orderId);

  if (foundOrder) {
    res.locals.order = foundOrder;
    res.locals.orderId = orderId;
    return next();
  } else {
    return next({
      status: 404,
      message: `Order ${orderId} was not found.`,
    });
  }
}

function hasStatus(req, res, next) {
  const { data } = req.body;

  if (
    !data.status ||
    !["pending", "preparing", "out-for-delivery", "delivered"].includes(
      data.status
    )
  ) {
    return next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, or delivered.",
    });
  }
  if (res.locals.order && res.locals.order.status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed.",
    });
  }
  return next();
}

function idMatchesRouteId(req, res, next) {
  const orderId = res.locals.orderId;
  const { data } = req.body;

  if (!data.id) {
    return next();
  }
  if (data.id !== orderId) {
    return next({
      status: 400,
      message: `Dish id (${data.id}) does not match route id (${orderId}).`,
    });
  }
  next();
}

function orderPending(req, res, next) {
  const { status } = res.locals.order;

  if (status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted or updated unless it is pending.",
    });
  }
  return next();
}

//Route handlers
function list(req, res) {
  res.json({ data: orders });
}

function create(req, res) {
  const { data } = req.body;
  const newOrder = {
    ...data,
    id: nextId(),
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;

  res.json({ data: order });
}

function destroy(req, res) {
  const { orderId } = req.params;
  const deleteIndex = orders.findIndex((order) => order.id === orderId);
  orders.splice(deleteIndex, 1);
  res.sendStatus(204);
}

module.exports = {
  create: [allValidProperties, hasDishes, hasDishQuantity, create],
  read: [orderExists, read],
  update: [
    orderExists,
    allValidProperties,
    idMatchesRouteId,
    hasDishes,
    hasDishQuantity,
    hasStatus,
    update,
  ],
  delete: [orderExists, orderPending, destroy],
  list,
};
