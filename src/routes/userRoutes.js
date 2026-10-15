const express = require('express');
const { getUsers, createUser } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', roleMiddleware('super_admin', 'admin'), getUsers);
router.post('/', roleMiddleware('super_admin', 'admin'), createUser);

module.exports = router;
