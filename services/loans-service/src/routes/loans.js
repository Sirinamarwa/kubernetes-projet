const express = require('express');
const router = express.Router();
const {
  getAllLoans,
  getLoansByUser,
  createLoan,
  returnLoan,
  deleteLoan,
} = require('../controllers/loanController');

router.get('/', getAllLoans);
router.get('/user/:userId', getLoansByUser);
router.post('/', createLoan);
router.put('/:id/return', returnLoan);
router.delete('/:id', deleteLoan);

module.exports = router;
