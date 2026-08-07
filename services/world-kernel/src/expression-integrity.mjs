export function audienceResponseStatus(response) {
  if (response === null || response === undefined) {
    return {
      responsePresent: false,
      deliveryNotSent: null,
      performedActionNotRecorded: null,
      completionNotClaimed: null,
      boundedStatusWitnesses: null,
    };
  }
  const deliveryNotSent = response.deliveryStatus === "not_sent";
  const performedActionNotRecorded =
    response.performedActionStatus === "none_recorded";
  const completionNotClaimed = response.completionStatus === "not_claimed";
  return {
    responsePresent: true,
    deliveryNotSent,
    performedActionNotRecorded,
    completionNotClaimed,
    boundedStatusWitnesses:
      deliveryNotSent && performedActionNotRecorded && completionNotClaimed,
  };
}
