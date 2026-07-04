/**
 * AI-ing (에이아잉) 공통 스크립트
 */
function copyAccount() {
  const accountNum = "1002-6334-1822";
  navigator.clipboard.writeText(accountNum).then(() => {
    alert("계좌번호가 클립보드에 복사되었습니다: " + accountNum);
  }).catch(err => {
    const el = document.createElement('textarea');
    el.value = accountNum;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("계좌번호가 복사되었습니다: " + accountNum);
  });
}
window.copyAccount = copyAccount;
