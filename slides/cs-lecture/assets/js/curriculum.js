/* =========================================================================
   과목 메타데이터 — 단일 출처(Single Source of Truth)
   여기에 한 줄을 추가하면 허브 카드 · 사이드바 · 이전/다음 네비게이션이 모두 갱신된다.
   slug = subjects/<slug>.html 파일명과 일치해야 한다.
   ========================================================================= */
window.CURRICULUM = {
  site: "CS 4년 커리큘럼",
  years: [
    { id: 1, badge: "1학년", cls: "y1", desc: "프로그래밍과 컴퓨터적 사고의 기초" },
    { id: 2, badge: "2학년", cls: "y2", desc: "자료를 다루고 효율을 따지는 핵심" },
    { id: 3, badge: "3학년", cls: "y3", desc: "컴퓨터를 움직이는 시스템 계층" },
    { id: 4, badge: "4학년", cls: "y4", desc: "응용과 심화, 그리고 현업 기술" },
  ],
  subjects: [
    // 1학년
    { slug: "programming-basics",     year: 1, icon: "💻", title: "프로그래밍 기초",       sub: "변수·제어문·함수로 시작하는 코딩의 기본" },
    { slug: "discrete-math",          year: 1, icon: "🔢", title: "이산수학",             sub: "논리·집합·그래프 — CS의 수학 언어" },
    { slug: "oop",                    year: 1, icon: "🧩", title: "객체지향 프로그래밍",   sub: "클래스·상속·다형성으로 코드를 설계하기" },
    // 2학년
    { slug: "data-structures",        year: 2, icon: "🗂️", title: "자료구조",             sub: "배열·리스트·트리·해시로 데이터를 담는 법" },
    { slug: "algorithms",             year: 2, icon: "⚡", title: "알고리즘",             sub: "정렬·탐색·그래프와 복잡도 분석" },
    { slug: "computer-architecture",  year: 2, icon: "🔧", title: "컴퓨터 구조",          sub: "CPU·메모리·이진수로 보는 기계의 속" },
    // 3학년
    { slug: "operating-systems",      year: 3, icon: "🖥️", title: "운영체제",             sub: "프로세스·스레드·메모리·스케줄링" },
    { slug: "networks",               year: 3, icon: "🌐", title: "컴퓨터 네트워크",       sub: "TCP/IP·HTTP — 데이터가 흐르는 길" },
    { slug: "databases",              year: 3, icon: "🗄️", title: "데이터베이스",         sub: "관계형 모델·SQL·트랜잭션" },
    { slug: "programming-languages",  year: 3, icon: "📜", title: "프로그래밍 언어론",     sub: "문법·의미·타입 시스템·패러다임" },
    { slug: "theory-of-computation",  year: 3, icon: "🧮", title: "계산이론",             sub: "오토마타·튜링머신·계산 가능성·P/NP" },
    // 4학년
    { slug: "compilers",              year: 4, icon: "🏗️", title: "컴파일러",             sub: "소스코드가 실행파일이 되기까지" },
    { slug: "concurrency",            year: 4, icon: "🧵", title: "병렬 / 동시성",        sub: "멀티코어·스레드·동기화·경쟁상태" },
    { slug: "software-engineering",   year: 4, icon: "🛠️", title: "소프트웨어 공학",       sub: "협업·설계·테스트로 좋은 SW 만들기" },
    { slug: "ai-ml",                  year: 4, icon: "🤖", title: "인공지능 / 머신러닝",   sub: "데이터로 학습하는 시스템의 원리" },
    { slug: "data-science",           year: 4, icon: "📊", title: "데이터 과학 / 빅데이터", sub: "전처리·통계·시각화·맵리듀스" },
    { slug: "security",               year: 4, icon: "🔐", title: "정보보안",             sub: "암호·인증·공격과 방어의 기본" },
    { slug: "web-distributed",        year: 4, icon: "☁️", title: "웹 / 분산 시스템",      sub: "확장 가능한 서비스를 만드는 구조" },
    { slug: "computer-graphics",      year: 4, icon: "🎨", title: "컴퓨터 그래픽스",       sub: "2D/3D 렌더링·변환 행렬·래스터화·셰이더" },
  ],
};
