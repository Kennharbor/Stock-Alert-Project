export function devUser(req, res, next) {
  req.user = {
    id: "57428c1a-a242-4f33-9c43-5debcfdbffd3",
  };

  next();
}