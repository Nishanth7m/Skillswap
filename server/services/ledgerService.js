const mongoose = require('mongoose');
const User = require('../models/User');
const Session = require('../models/Session');
const CreditTransaction = require('../models/CreditTransaction');
const logger = require('../config/logger');

/**
 * Confirms a session and reserves 1 credit from the learner's balance, storing it in escrow.
 */
const confirmAndReserve = async (sessionId, learnerId, teacherId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Atomically check and decrement the learner's balance
    const updatedLearner = await User.findOneAndUpdate(
      { _id: learnerId, creditBalance: { $gte: 1 } },
      { $inc: { creditBalance: -1 } },
      { session, new: true }
    );

    if (!updatedLearner) {
      throw new Error('Insufficient credit balance to book this session');
    }

    // 2. Find and update the session status to CONFIRMED
    const updatedSession = await Session.findOneAndUpdate(
      { _id: sessionId, status: 'PENDING' },
      { status: 'CONFIRMED', creditsReserved: true },
      { session, new: true }
    );

    if (!updatedSession) {
      throw new Error('Session is not in a pending state and cannot be confirmed');
    }

    // 3. Record the reservation transaction in the ledger (Escrow: toUser is null)
    await CreditTransaction.create([
      {
        session: sessionId,
        fromUser: learnerId,
        toUser: null,
        amount: 1,
        type: 'SESSION_RESERVATION',
        status: 'COMPLETED',
      }
    ], { session });

    await session.commitTransaction();
    logger.info(`Credits reserved for session: ${sessionId}. Learner: ${learnerId} balance is now ${updatedLearner.creditBalance}`);
    
    return updatedSession;
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Error in confirmAndReserve for session ${sessionId}: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Completes a session and transfers the reserved 1 credit from escrow to the teacher's balance.
 */
const completeAndTransfer = async (sessionId, learnerId, teacherId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Atomically update session status to COMPLETED to prevent simultaneous completions
    const updatedSession = await Session.findOneAndUpdate(
      { _id: sessionId, status: 'CONFIRMED', creditsReserved: true },
      { status: 'COMPLETED', creditsReserved: false },
      { session, new: true }
    );

    if (!updatedSession) {
      throw new Error('Session has already been completed, cancelled, or does not have reserved credits.');
    }

    // 2. Increment the teacher's balance
    const updatedTeacher = await User.findByIdAndUpdate(
      teacherId,
      { $inc: { creditBalance: 1 } },
      { session, new: true }
    );

    if (!updatedTeacher) {
      throw new Error('Teacher user not found');
    }

    // 3. Record the transaction in the ledger (Escrow release: fromUser is null)
    await CreditTransaction.create([
      {
        session: sessionId,
        fromUser: null,
        toUser: teacherId,
        amount: 1,
        type: 'SESSION_PAYMENT',
        status: 'COMPLETED',
      }
    ], { session });

    await session.commitTransaction();
    logger.info(`Session ${sessionId} completed. 1 credit transferred to teacher: ${teacherId}`);
    
    return updatedSession;
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Error in completeAndTransfer for session ${sessionId}: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Cancels a confirmed session and refunds the reserved 1 credit back to the learner's balance.
 */
const cancelAndRefund = async (sessionId, learnerId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Atomically update session status and credit reservation flag
    const updatedSession = await Session.findOneAndUpdate(
      { _id: sessionId, status: 'CONFIRMED', creditsReserved: true },
      { status: 'CANCELLED', creditsReserved: false },
      { session, new: true }
    );

    if (!updatedSession) {
      throw new Error('Session is not in a confirmed state or credits are not reserved');
    }

    // 2. Refund 1 credit back to the learner
    const updatedLearner = await User.findByIdAndUpdate(
      learnerId,
      { $inc: { creditBalance: 1 } },
      { session, new: true }
    );

    if (!updatedLearner) {
      throw new Error('Learner user not found');
    }

    // 3. Record the refund transaction in the ledger (Escrow release: fromUser is null)
    await CreditTransaction.create([
      {
        session: sessionId,
        fromUser: null,
        toUser: learnerId,
        amount: 1,
        type: 'SESSION_REFUND',
        status: 'COMPLETED',
      }
    ], { session });

    await session.commitTransaction();
    logger.info(`Session ${sessionId} cancelled. 1 credit refunded to learner: ${learnerId}`);
    
    return updatedSession;
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Error in cancelAndRefund for session ${sessionId}: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  confirmAndReserve,
  completeAndTransfer,
  cancelAndRefund,
};
