const express = require('express');
const {
    createInvitation,
    getMyInvitations,
    acceptInvitation,
    declineInvitation
} = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
    .post(createInvitation)
    .get(getMyInvitations);

router.post('/:id/accept', acceptInvitation);
router.post('/:id/decline', declineInvitation);

module.exports = router;
