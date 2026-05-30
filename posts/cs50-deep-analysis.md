# CS50 2025 深度分析：哈佛计算机导论全11周课程精要

> 基于 Harvard CS50x 2025 课程官网 (cs50.harvard.edu/x/2025/) 的深度研究与分析
> 研究成果，用于复习与教学参考

---

## 一、课程总览

CS50 是 Harvard University 的计算机科学导论课程（CS50's Introduction to Computer Science），由 David J. Malan 教授主讲。它不仅是哈佛校内最受欢迎的课程之一，也是全球最知名的公开课之一——三分之二的学生在修读前从未接触过编程。

### 2025 课程结构

| Week | 主题 | 核心内容 |
|------|------|---------|
| 0 | Scratch | 计算思维、二进制、抽象、算法 |
| 1 | C | 编译原理、类型系统、控制流 |
| 2 | Arrays | 编译四阶段、数组、字符串、加密 |
| 3 | Algorithms | 搜索/排序、渐进记号、递归 |
| 4 | Memory | 指针、动态内存、堆栈、缓冲区溢出 |
| 5 | Data Structures | 链表/哈希表/trie/抽象数据类型 |
| 6 | Python | 从C过渡到高层语言，模块/OOP |
| 7 | SQL | 关系数据库、索引/B树、SQL注入 |
| 8 | HTML/CSS/JS | 互联网协议栈、DOM、事件驱动 |
| 9 | Flask | Web框架、路由、Session、API |
| 10 | The End | 网络安全、最终项目 |

此外还有 **AI Week**（人工智能专题）和 **Seminars**（研讨会）。

### 2025 年新特性

根据官网 "What's new for 2025?" 页面：

1. **全新改进的讲座** — 录制质量与内容全面升级
2. **AI-powered CS50 Duck** — 更强的AI助教，24/7答疑
3. **help50 按钮** — 终端命令出错时自动提供帮助
4. **design50 按钮** — 对代码设计质量提供定性反馈
5. **Roku 平台支持** — 新增 Roku 观看渠道

### 学习流程

官网给出了标准学习路径（Mermaid流程图）：

```
观看讲座(Lecture) → 推荐观看小组辅导(Section)
                 → 推荐观看短视频(Shorts)
                 → 提交习题集(Problem Set)
→ 最终项目(Final Project)
```

---

## 二、逐周深度分析

### Week 0: Scratch — 编程思维启蒙

**官方定位**：用零代码门槛建立计算思维。

**知识点清单**：

**1. 计算机科学本质**
- 计算机科学 ≠ 编程，而是 **关于信息的科学**（information science）
- 核心过程：Input → [Algorithm] → Output
- 所有问题都可以抽象为"输入→处理→输出"

**2. 信息表示（Representation）**
- **Unary（一元计数）**：用符号个数表示数值，如 `||||` = 4
- **Binary（二进制）**：用0/1位序列表示一切，计算机的基石
  - 8 bits = 1 byte，可表示 0-255
  - 所有数据（文本、图像、视频、音频）最终都是二进制
- **ASCII**：128个字符的编码标准（A=65, a=97, 0=48）
- **Unicode**：ASCII的超集，支持全球所有语言字符，emoji也是Unicode
- **RGB**：每个像素 = (R, G, B) 三个字节，实现全彩显示

**3. 抽象（Abstraction）**
- 将复杂系统分层，每层隐藏底层细节，只暴露接口
- 类比：开车不需要懂内燃机 — 方向盘/油门/刹车就是抽象
- 编程中的函数就是抽象的基本单元

**4. 算法思维**
- 算法 = 解决问题的步骤序列，必须是精确的、有限步的
- 伪代码（Pseudocode）作为设计工具
- 用撕电话簿的比喻理解：
  - 一页一页撕 → O(n) 线性
  - 一次撕两页 → O(n/2) 仍是线性
  - 每次撕一半 → O(log n) 对数的力量

**5. Scratch 编程概念**
| 编程概念 | Scratch对应 | 本质 |
|---------|------------|------|
| 函数 | 积木块（Blocks） | 可复用的代码片段 |
| 参数 | 积木块的输入框 | 函数输入 |
| 返回值 | 积木块输出 | 函数输出 |
| 变量 | 变量积木 | 命名存储位置 |
| 布尔表达式 | 六边形积木 | 真/假判断 |
| 条件 | if/if-else积木 | 分支执行 |
| 循环 | repeat/forever积木 | 重复执行 |
| 事件 | "当绿旗被点击" | 触发机制 |
| 线程 | 多绿旗同时执行 | 并发执行 |

**Problem Set 0**: 用 Scratch 创建一个交互式项目（游戏/动画/故事）。

> **教学用意**：Week 0 不碰任何代码，让学生在可视化环境中建立"顺序-分支-循环-抽象"的思维模型，这些模型在后续11周中不断复现和深化。

---

### Week 1: C — 直面计算机的真相

**官方定位**：一头扎进底层，理解计算机如何真正运行。

**知识点清单**：

**1. 从源代码到机器码**
```
hello.c (源代码，人类可读)
   ↓ 编译器 (compiler: clang/gcc)
hello   (机器码，CPU可执行)
```
- C 是编译型语言：先编译再运行
- 对比解释型语言（Python/JS）：运行时逐行翻译
- 编译器做的事：词法分析 → 语法分析 → 语义分析 → 代码生成 → 优化

**2. C 程序结构**
```c
#include <stdio.h>      // 预处理指令，包含标准IO库

int main(void)          // 入口函数，int是返回类型
{
    printf("hello, world\n");  // 函数调用
    return 0;           // 返回0表示成功
}
```

**3. 核心概念**

**类型系统（Types）**：C是静态类型语言，每个变量必须声明类型

| 类型 | 大小(典型) | 范围 | 用途 |
|------|-----------|------|------|
| `int` | 4 bytes | ±2.1×10⁹ | 整数 |
| `unsigned int` | 4 bytes | 0 到 4.3×10⁹ | 非负整数 |
| `char` | 1 byte | -128 到 127 | 字符 |
| `float` | 4 bytes | ±3.4×10³⁸ | 单精度浮点 |
| `double` | 8 bytes | ±1.7×10³⁰⁸ | 双精度浮点 |
| `bool` | 1 byte | true/false | 布尔值 |
| `long` | 8 bytes | ±9.2×10¹⁸ | 大整数 |

**整数溢出（Integer Overflow）**：
- Y2K问题本质：用2位数字存年份，99→00
- 2038问题：32位time_t从1970-01-01计秒，2038年溢出
- 波音787：软件运行248天后计数器溢出，必须重启

**浮点不精确（Floating-Point Imprecision）**：
- `0.1 + 0.2 != 0.3` — IEEE 754的固有缺陷
- 原因：十进制小数在二进制中可能是无限循环小数
- 金融计算应使用整数（分/厘）而非浮点数

**4. 控制流**
- 条件：`if / else if / else`、`switch-case`
- 循环：`for`、`while`、`do-while`
- 三元运算符：`condition ? true_value : false_value`

**5. 编程风格**
- **Correctness（正确性）**：代码能跑通
- **Design（设计）**：结构合理、可维护
- **Style（风格）**：可读性、缩进、命名、注释
- CS50 引入 style50 工具自动检查代码风格

**6. 编译过程全景**（贯穿Week 1-2）

```
源代码 → 预处理(Preprocessing) → 编译(Compiling) → 汇编(Assembling) → 链接(Linking) → 可执行文件
```

- **预处理**：处理 `#include`、`#define`，展开宏，去除注释
- **编译**：C → 汇编语言 (.s)
- **汇编**：汇编 → 机器码目标文件 (.o)
- **链接**：合并多个 .o 文件和库 → 可执行文件

**Shorts 补充**：
- Data Types（数据类型深度）
- Operators（运算符，包括位运算 & | ^ ~ << >>）
- Conditional Statements（条件语句）
- Loops（循环详解）
- Command Line（Linux命令：cd, ls, mkdir, rm, cp, mv）
- Magic Numbers（魔法数字的危害和替换）

**Problem Set 1**: 实现 Mario 金字塔（嵌套循环）、信用卡号校验（Luhn算法）

> **教学用意**：Week 1 的核心是"撕掉魔术"——让学生看到编译过程、内存布局、类型系统的真实面貌。C 不是"简单"的语言，但它是"透明"的语言。

---

### Week 2: Arrays — 编译、调试与加密

**官方定位**：理解编译全流程 + 数组和字符串的本质。

**知识点清单**：

**1. 编译四阶段详解**

| 阶段 | 输入 | 输出 | 命令 |
|------|------|------|------|
| 预处理 | `.c` | `.c`（宏展开后） | `clang -E` |
| 编译 | `.c` | `.s`（汇编） | `clang -S` |
| 汇编 | `.s` | `.o`（目标文件） | `clang -c` |
| 链接 | `.o` | 可执行文件 | `clang -o` |

**2. 调试（Debugging）**

CS50 使用调试工具链：
- **debug50**：CS50封装的GDB图形化调试器
  - Step Over：执行当前行，不进入函数
  - Step Into：进入函数内部
  - Breakpoint（断点）：程序运行到指定行暂停
- **print大法**：最原始但有效的调试手段
- **橡皮鸭调试法**（Rubber Duck Debugging）：向橡皮鸭解释每一行代码

**3. 数组（Arrays）**

```c
int scores[3];              // 声明3个int的数组
scores[0] = 72;             // 索引从0开始
scores[1] = 73;
scores[2] = 33;
// scores[3] = 100;         // ❌ 越界！未定义行为
```

- 数组在内存中是**连续存储**的
- C 不检查越界 — 这是性能代价换来的自由，也是bug的温床
- 数组名本身是指向首元素的指针

**4. 字符串的真相**

```c
string s = "HI!";  // 这个"string"是什么？
// CS50 的 string 本质是 typedef char *string;
// "HI!" 本质是 char[4] = {'H', 'I', '!', '\0'};
```

- C 没有原生的 string 类型！
- 字符串 = `char*`（字符指针），指向以 `\0`（NUL）结尾的字符数组
- `\0` = 字符串终止符，ASCII值为0
- `strlen()` 遍历到 `\0` 为止来计算长度

**5. 命令行参数**

```c
int main(int argc, char *argv[])
{
    // argc = 参数个数（包括程序名）
    // argv = 参数字符串数组
    // argv[0] = 程序名
    // argv[1] = 第一个参数
    ...
}
```

- `argc` 和 `argv` 来自操作系统
- exit status：`return 0` 成功，`return 1`（或其他非零）失败

**6. 加密思想（Cryptography）**

- 明文（Plaintext）→ [密钥] → 密文（Ciphertext）
- 凯撒密码（Caesar Cipher）：每个字母向后移k位（k=密钥）
- 维吉尼亚密码（Vigenère Cipher）：使用关键词轮转
- 现代加密：
  - 对称加密（AES）：同一密钥加密解密
  - 非对称加密（RSA）：公钥加密、私钥解密

**Shorts 补充**：
- Functions（函数：声明、定义、调用、返回值）
- Variables and Scope（作用域：全局 vs 局部，块作用域）
- Debugging ("Step through" / "Step into")
- Arrays（数组详解）
- Command Line Arguments

**Problem Set 2**: 
- Scrabble（字符数组分值计算）
- Readability（Coleman-Liau可读性指数）
- Caesar / Substitution（加密实现）

> **教学用意**：Week 2 的核心是"看穿抽象"——`string` 不是天赐之物，而是 `char*` 的语法糖。理解编译过程，才能理解为什么 `#include`、链接库、头文件这些概念存在。

---

### Week 3: Algorithms — 效率的数学语言

**官方定位**：用数学眼光审视算法效率，建立复杂度分析思维。

**知识点清单**：

**1. 搜索算法**

| 算法 | 最好 | 最坏 | 平均 | 前提条件 |
|------|------|------|------|---------|
| 线性搜索 | O(1) | O(n) | O(n) | 无 |
| 二分搜索 | O(1) | O(log n) | O(log n) | **有序数组** |

二分查找的设计范式：**分治法（Divide & Conquer）**
```
1. 找到中点
2. 中点 == 目标？→ 找到
3. 中点 > 目标？→ 搜索左半
4. 中点 < 目标？→ 搜索右半
5. 重复直到找到或区间为空
```

**2. 排序算法**

| 算法 | 最坏情况 | 最好情况 | 空间 | 稳定性 |
|------|---------|---------|------|--------|
| 冒泡排序 | O(n²) | O(n) | O(1) | 稳定 |
| 选择排序 | O(n²) | O(n²) | O(1) | 不稳定 |
| 归并排序 | O(n log n) | O(n log n) | O(n) | 稳定 |

**冒泡排序**：相邻元素两两比较，大的"冒"到右边
- 每一趟把最大的元素移到末尾
- 优化：如果一趟没有交换，提前结束 → 最好O(n)

**选择排序**：每趟选择最小元素放到已排序区末尾
- 总是做n(n-1)/2次比较，最优也是O(n²)

**归并排序**：分治法的典范
```
1. 如果数组长度≤1，已排序
2. 分成两半
3. 递归排序左半
4. 递归排序右半
5. 合并两个有序子数组
```

**3. 渐进记号（Asymptotic Notation）**

这是计算机科学中最核心的数学工具之一：

| 记号 | 读作 | 含义 | 类比 |
|------|------|------|------|
| **O(n)** | 大O | 上界（最坏情况） | 最多跑多少步 |
| **Ω(n)** | 大Omega | 下界（最好情况） | 至少跑多少步 |
| **Θ(n)** | 大Theta | 紧确界 | 步数恰好在上下界之间 |

常见时间复杂度比较：
```
O(1)      < O(log n) < O(n)     < O(n log n) < O(n²)    < O(2ⁿ)    < O(n!)
常数时间     对数时间    线性时间    线性对数      平方时间     指数时间    阶乘时间
```

例子：n = 1,000,000（一百万）
- O(1): 1 步
- O(log n): ~20 步
- O(n): 1,000,000 步
- O(n log n): ~20,000,000 步
- O(n²): 1,000,000,000,000 步

**4. 递归（Recursion）**

递归三要素：
1. **基案（Base Case）**：什么时候停止
2. **递归步骤（Recursive Step）**：如何缩小问题
3. **向基案收敛**：确保每次递归都在靠近停止条件

```c
// 阶乘：递归版
int fact(int n) {
    if (n <= 1) return 1;        // 基案
    return n * fact(n - 1);      // 递归步骤
}
```

递归 vs 迭代：
- 递归优雅但消耗栈空间
- 每个递归调用占用一个栈帧（stack frame）
- 尾递归可被编译器优化为迭代

**5. 调用栈（Call Stack）**

- 函数调用在栈上创建栈帧（stack frame）
- 栈帧包含：参数、局部变量、返回地址
- 递归过深 → 栈溢出（Stack Overflow）
- 理解调用栈是理解递归调试的关键

**6. 自定义类型**

```c
typedef struct {
    string name;
    string number;
} person;

typedef int integer;  // 别名
```

**Shorts 补充**：
- Linear Search（线性搜索代码详解）
- Binary Search（二分查找伪代码→代码）
- Bubble Sort（冒泡排序逐步演示）
- Selection Sort（选择排序逐步演示）
- Recursion（递归思维训练）
- Merge Sort（归并排序分步骤）

**Problem Set 3**:
- Sort（实现3种排序+计时比较）
- Plurality / Runoff（投票算法实现）

> **教学用意**：Week 3 是CS50的"数学课"——让学生第一次意识到，写出能跑的程序和写出高效的程序是两回事。O(n²) vs O(n log n) 在数据量大时是"跑10秒"和"跑到世界末日"的区别。

---

### Week 4: Memory — 计算机的血液

**官方定位**：指针、动态内存、堆栈——理解计算机如何在底层管理内存。这是CS50最具挑战性的一周。

**知识点清单**：

**1. 指针（Pointers）**

指针是C语言最强大也最危险的概念。

```c
int n = 50;
int *p = &n;   // p是指向n的指针
// &n = n的地址（十六进制值）
// *p = 解引用，访问p指向的值（=50）
```

内存模型：
```
地址:  0x100  0x104  0x108  0x10C
内容:  [ 50 ] [  ? ] [  ? ] [  ? ]
       ↑ n=0x100
                 ↑ p=0x200 → stores 0x100
```

- `&` = "取地址"运算符
- `*` = "解引用"运算符（有双重含义：声明时表示指针类型，使用时表示解引用）
- `NULL` = 空指针，值为0，解引用会导致段错误

**2. 指针的指针**

```c
int n = 50;
int *p = &n;      // p → n
int **pp = &p;    // pp → p → n
```

**3. 指针算术（Pointer Arithmetic）**

```c
int arr[] = {1, 2, 3, 4, 5};
int *p = arr;      // p → arr[0]
*(p + 1) == arr[1]; // 等价，因为p+1跳过sizeof(int)个字节
```

`arr[i]` 的本质是 `*(arr + i)` —— 这就是为什么数组在传给函数时会退化为指针。

**4. 内存布局**

```
高地址
┌─────────────┐
│   栈(Stack)   │ ← 局部变量、函数调用帧
│    ↓  ↓  ↓   │   自动管理，LIFO
│              │
│   (空闲空间)   │
│              │
│    ↑  ↑  ↑   │
│   堆(Heap)    │ ← malloc分配的内存
│              │   手动管理
├─────────────┤
│  全局/静态数据  │ ← 全局变量、static变量
├─────────────┤
│  代码段(Text)  │ ← 程序指令（只读）
└─────────────┘
低地址
```

**5. 动态内存分配**

三兄弟：

| 函数 | 作用 | 参数 | 返回值 |
|------|------|------|--------|
| `malloc()` | 分配内存 | 字节数 | `void*`，失败返回NULL |
| `calloc()` | 分配+清零 | 个数, 每个字节数 | `void*`，失败返回NULL |
| `realloc()` | 调整已分配内存大小 | 原指针, 新大小 | `void*`，失败返回NULL |

```c
int *arr = malloc(10 * sizeof(int));  // 分配10个int的空间
if (arr == NULL) return 1;            // ⚠️ 必须检查！
// ... 使用 ...
free(arr);                            // ⚠️ 必须释放！
```

**三大内存错误**：
1. **内存泄漏（Memory Leak）**：`malloc` 后忘记 `free`
2. **悬空指针（Dangling Pointer）**：`free` 后继续使用指针
3. **双重释放（Double Free）**：对同一指针 `free` 两次

**6. swap 函数——理解指针的经典案例**

```c
// ❌ 错误：传值，只交换副本
void swap_wrong(int a, int b) {
    int tmp = a; a = b; b = tmp;
}

// ✅ 正确：传指针，交换原值
void swap(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}
```

**7. 缓冲区溢出（Buffer Overflow）**

```c
char buffer[10];
gets(buffer);  // ❌ 危险！输入超过10字符会溢出
```

溢出后果：
- 覆盖栈上相邻变量
- 覆盖返回地址 → 控制程序流程
- 这是历史上最臭名昭著的安全漏洞类型
- 防御：使用 `fgets()` 替代 `gets()`，永远检查边界

**8. 文件I/O**

```c
FILE *fp = fopen("file.txt", "r");  // 打开文件
if (fp == NULL) return 1;            // 必须检查！
char c;
while ((c = fgetc(fp)) != EOF) {     // 逐字符读取
    printf("%c", c);
}
fclose(fp);                          // 必须关闭！
```

**9. 图像处理**

- JPEG头：`0xFF 0xD8 0xFF`（十六进制）
- 每个像素 = 3 bytes（RGB）
- BMP的文件头包含宽、高、像素数据偏移量
- Week 4的PSET实现图像滤镜（灰度、反射、模糊、边缘检测）

**10. valgrind——内存调试神器**

```bash
valgrind ./program        # 检测内存泄漏和越界
valgrind --leak-check=full ./program  # 详细泄漏报告
```

**Shorts 补充**：
- Hexadecimal（十六进制深入）
- Pointers（指针全面讲解）
- Defining Custom Types（typedef/struct）
- Dynamic Memory Allocation（malloc/free/calloc/realloc详解）
- Call Stacks（调用栈机制）
- File Pointers（文件指针操作）

**Problem Set 4**:
- Volume（WAV音频音量调节 → 文件I/O练习）
- Filter（实现图像滤镜：grayscale, sepia, reflect, blur）
- Recover（从磁盘镜像中恢复删除的JPEG图片）

> **教学用意**：Week 4是CS50的"成人礼"——如果你能彻底理解指针、malloc/free、栈vs堆、buffer overflow，你就真正理解了计算机如何工作。这也是为什么Malan反复强调：理解内存是区分"会写代码"和"懂计算机"的分水岭。

---

### Week 5: Data Structures — 数据的艺术

**官方定位**：数据结构是算法的载体。理解不同结构的设计权衡。

**知识点清单**：

**1. 抽象数据类型（ADT）概念**

ADT = 数据类型 + 操作集合，隐藏实现细节。

```
  接口层：push() / pop() / peek()
  ──────────────────────────────
  实现层：可以用数组，也可以用链表
```

这与Week 0的"抽象"理念一脉相承：**使用者不关心实现，实现者不暴露细节**。

**2. 链表（Linked Lists）**

**单向链表**：
```c
typedef struct node {
    int number;
    struct node *next;  // 指向下一个节点
} node;
```

操作复杂度：

| 操作 | 数组 | 单向链表 |
|------|------|---------|
| 随机访问 | O(1) | O(n) |
| 头部插入/删除 | O(n) | O(1) |
| 尾部插入 | O(1)/O(n) | O(n) |
| 查找 | O(n) | O(n) |

**双向链表**：每个节点有 `prev` 和 `next` 两个指针
- 可以双向遍历
- 尾部删除从O(n)降到O(1)

链表 vs 数组的取舍：
- 链表擅长频繁插入/删除
- 数组擅长随机访问和缓存友好性

**3. 栈（Stack）**

- LIFO（Last In, First Out）后进先出
- 操作：`push()` 入栈、`pop()` 出栈、`peek()` 查看栈顶
- 应用：函数调用栈、括号匹配、撤销操作、表达式求值

**4. 队列（Queue）**

- FIFO（First In, First Out）先进先出
- 操作：`enqueue()` 入队、`dequeue()` 出队
- 应用：打印队列、BFS、消息队列、任务调度

**5. 树（Trees）**

**二叉搜索树（BST）**：
- 左子树 < 父节点 < 右子树
- 搜索/插入/删除：平均 O(log n)，最坏 O(n)（退化为链表）

```c
typedef struct node {
    int number;
    struct node *left;
    struct node *right;
} node;

bool search(node *tree, int number) {
    if (tree == NULL) return false;
    if (number < tree->number) return search(tree->left, number);
    if (number > tree->number) return search(tree->right, number);
    return true;  // number == tree->number
}
```

树的概念：
- 根节点（Root）
- 叶节点（Leaf）
- 深度（Depth）：根到节点的边数
- 高度（Height）：节点到最深叶子的边数

**平衡树**：AVL树、红黑树 → 保证O(log n)

**6. 哈希表（Hash Table）**

最接近"O(1)万能查找"的结构。

```
hash("Alice") → 3 → table[3] → [Alice: 555-1234]
hash("Bob")   → 7 → table[7] → [Bob:   555-5678]
hash("Eve")   → 3 → table[3] → [Alice: ...] → [Eve: 555-9999] (链表法)
```

核心要素：
- **哈希函数**：输入 → [0, bucket_n-1]
- **碰撞处理**：链表法（Chaining）或开放寻址法（Open Addressing）
- 好的哈希函数 = 均匀分布 + 快速计算
- 装填因子（Load Factor）= n / bucket数

**7. Trie（前缀树/字典树）**

```
        root
       / | \
      c  b  d
     /   |   \
    a    a    o
   /     |     \
  t      g      g
```

- 每个节点存储一个字符
- 查找时间 = O(k)，k为键长度（与数据量无关！）
- 空间换时间的极致：大量指针占用内存
- 应用：自动补全、拼写检查、IP路由

**权衡总结**：

| 结构 | 查找 | 插入 | 删除 | 空间 | 适用场景 |
|------|------|------|------|------|---------|
| 数组 | O(1) | O(n) | O(n) | 最小 | 已知大小，频繁随机访问 |
| 链表 | O(n) | O(1) | O(1) | 中 | 频繁增删，不关心位置 |
| BST | O(log n)* | O(log n)* | O(log n)* | 中 | 需要有序遍历 |
| 哈希表 | O(1)* | O(1)* | O(1)* | 大 | 只需查/插/删，不关心顺序 |
| Trie | O(k) | O(k) | O(k) | 极大 | 字符串前缀匹配 |

\* 均摊/平均情况

**Shorts 补充**：
- Structures（struct语法详解）
- Singly-Linked Lists（单向链表代码实现）
- Doubly-Linked Lists（双向链表）
- Stacks（栈实现）
- Queues（队列实现）
- Hash Tables（哈希表碰撞处理）
- Tries（Trie构建与搜索）

**Problem Set 5**: Speller（实现拼写检查器——用哈希表或Trie实现字典查找，与教授提供的实现比赛速度）

> **教学用意**：Week 5 的核心是"没有银弹"——每个数据结构都有其trade-off。好的工程师不是背数据结构，而是理解场景需求后做出正确的取舍。

---

### Week 6: Python — 站在C的肩膀上

**官方定位**：用C的经验理解Python。不是学新语言，是发现"啊，原来就是那个！"。

**知识点清单**：

**1. C vs Python 对照表**

| 概念 | C | Python |
|------|---|--------|
| 编译/执行 | 编译后执行 | 解释执行 |
| 类型 | 静态类型 | 动态类型（鸭子类型） |
| 内存管理 | 手动（malloc/free） | 自动（引用计数+GC） |
| 字符串 | `char*` + `\0` | `str` 对象 |
| 数组 | `int arr[10]` | `list`（可变） |
| 字典 | 无（需实现哈希表） | `dict`（内置） |
| 集合 | 无 | `set`（内置） |
| 入口 | `int main(int argc, char* argv[])` | `if __name__ == "__main__":` |
| 头文件 | `#include <...>` | `import ...` |

**2. Python 的 "C 血统"**

每个Python概念都能在C中找到对应：

```python
# Python
names = ["Alice", "Bob", "Charlie"]
for name in names:
    print(f"Hello, {name}")

# C 等价
string names[] = {"Alice", "Bob", "Charlie"};
for (int i = 0; i < 3; i++) {
    printf("Hello, %s\n", names[i]);
}
```

Python的 `for...in` 循环隐藏了索引管理——这正是C让你手动处理的东西。

**3. dict 和 set 的底层**

- `dict`：基于哈希表实现，O(1)平均查找
- `set`：基于哈希表但只存key不存value
- 这就是Week 5用C手动构建的东西！

**4. 列表推导式（List Comprehension）**

```python
# 传统方式
squares = []
for i in range(10):
    squares.append(i * i)

# 列表推导式
squares = [i * i for i in range(10)]

# 带条件
evens = [i for i in range(10) if i % 2 == 0]
```

**5. 面向对象编程（OOP）**

```python
class Student:
    def __init__(self, name, id):
        self.name = name  # 实例变量
        self.id = id

    def __str__(self):
        return f"{self.name} ({self.id})"

# 使用
s = Student("Alice", 12345)
print(s)  # 调用 __str__
```

Python的OOP特色：
- `self` 显式传递（相当于C++的 `this`，但必须显式写）
- 没有真正的private（约定 `_name` 表示"不碰我"）
- 多重继承、Mixin模式
- 魔法方法：`__init__`, `__str__`, `__len__`, `__eq__` ...

**6. 模块和包**

```python
import sys              # 标准库模块
from sys import argv    # 导入特定名称
import numpy as np      # 别名
from my_module import * # 不推荐，命名污染
```

**7. 异常处理**

```python
try:
    x = int(input("x: "))
    result = 10 / x
except ValueError:
    print("请输入数字！")
except ZeroDivisionError:
    print("不能除以0！")
else:
    print(f"结果：{result}")  # 无异常时执行
finally:
    print("清理资源")          # 总是执行
```

**8. 文件操作**

```python
# 推荐写法（自动关闭）
with open("file.txt", "r") as f:
    for line in f:
        print(line.strip())

# CSV处理
import csv
with open("data.csv") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"])
```

**9. 正则表达式**

```python
import re
if re.search(r"^[a-zA-Z0-9_]+@\w+\.\w+$", email):
    print("有效邮箱")
```

**Shorts 补充**：Python 语法速成（专为C程序员设计）

**Problem Set 6**:
- Hello（用Python重写Week 1的C程序 → 感受Python的简洁）
- Mario（金字塔，一行代码解决两重循环）
- Credit / Readability（重写Week 1/2的PSET → 体会高层语言的威力）
- DNA（法医DNA匹配——文件处理+算法）

> **教学用意**：Week 6 本质上在说："看，Python里这些dict/set/list，你不是已经理解它们底层怎么工作的了吗？你不是在Week 5亲手用C实现过哈希表吗？"——这是CS50教学哲学最灿烂的时刻：学生不是在学Python，而是在发现Python。

---

### Week 7: SQL — 数据的世界

**官方定位**：从文件存储到关系数据库，理解结构化数据的管理方式。

**知识点清单**：

**1. 为什么需要数据库**

- 文件存储的问题：并发访问、数据一致性、查询效率
- CRUD：Create / Read / Update / Delete
- 数据库管理系统（DBMS）：MySQL, PostgreSQL, SQLite

**2. SQL 核心语法**

```sql
-- 创建表
CREATE TABLE movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER,
    rating REAL
);

-- 插入
INSERT INTO movies (title, year, rating) VALUES ('Inception', 2010, 8.8);

-- 查询
SELECT * FROM movies;
SELECT title, year FROM movies WHERE year >= 2010;
SELECT * FROM movies WHERE title LIKE 'Harry%';  -- 模糊匹配
SELECT * FROM movies ORDER BY rating DESC LIMIT 10;

-- 更新
UPDATE movies SET rating = 9.0 WHERE title = 'Inception';

-- 删除
DELETE FROM movies WHERE year < 2000;
```

**3. 约束（Constraints）**

| 约束 | 含义 |
|------|------|
| `PRIMARY KEY` | 唯一标识一行 |
| `FOREIGN KEY` | 引用另一表的主键 |
| `NOT NULL` | 不允许为空 |
| `UNIQUE` | 列值唯一 |
| `CHECK` | 自定义条件 |
| `DEFAULT` | 默认值 |

**4. JOIN —— 关系数据库的灵魂**

```sql
-- INNER JOIN：只返回匹配的行
SELECT title, name
FROM movies
JOIN directors ON movies.director_id = directors.id;

-- LEFT JOIN：保留左表所有行
SELECT title, name
FROM movies
LEFT JOIN directors ON movies.director_id = directors.id;
```

JOIN 类型图：
```
INNER JOIN:     [A ∩ B]
LEFT JOIN:      [A] + [A ∩ B]
RIGHT JOIN:     [A ∩ B] + [B]
FULL JOIN:      [A ∪ B]
```

**5. 索引（Index）与 B 树**

```sql
CREATE INDEX idx_movie_title ON movies(title);
```

- 索引 = 数据结构的"目录"，加速查找
- 底层通常是 **B树（B-Tree）**：自平衡的多路搜索树
- B树特性：所有叶节点在同一深度，磁盘I/O友好
- 没有索引 → 全表扫描 O(n)
- 有索引 → B树查找 O(log n)
- 代价：写操作变慢（需要更新索引），占用额外空间

**6. 事务（Transactions）与 ACID**

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- 或 ROLLBACK 回滚
```

ACID 原则：
- **A**tomicity（原子性）：全做或全不做
- **C**onsistency（一致性）：事务前后数据库状态一致
- **I**solation（隔离性）：并发事务互不干扰
- **D**urability（持久性）：提交后数据不丢失

**7. 竞态条件（Race Condition）**

两个事务同时操作同一数据 → 结果取决于执行顺序。

```sql
-- 危险操作序列：
T1: SELECT balance FROM accounts WHERE id = 1;  -- 得到 200
T2: SELECT balance FROM accounts WHERE id = 1;  -- 得到 200
T1: UPDATE accounts SET balance = 100 WHERE id = 1;  -- 200-100=100
T2: UPDATE accounts SET balance = 150 WHERE id = 1;  -- 200-50=150  ← 覆盖了T1！
```

防御：加锁（Locking），使用适当的隔离级别。

**8. SQL 注入攻击（SQL Injection）**

```python
# ❌ 危险！
name = request.form.get("username")
db.execute(f"SELECT * FROM users WHERE name = '{name}'")

# 用户输入: ' OR '1'='1' --
# 生成SQL: SELECT * FROM users WHERE name = '' OR '1'='1' --'
# 结果：返回所有用户！
```

```python
# ✅ 安全：参数化查询
db.execute("SELECT * FROM users WHERE name = ?", name)
```

**9. SQL 函数和聚合**

```sql
SELECT COUNT(*), AVG(rating), MAX(year), MIN(year) FROM movies;
SELECT year, COUNT(*) FROM movies GROUP BY year;
SELECT year, COUNT(*) FROM movies GROUP BY year HAVING COUNT(*) > 5;
```

**Shorts 补充**：SQL（语法 + 实例详解）

**Problem Set 7**:
- Songs（查询Spotify歌曲数据库）
- Movies（查询IMDB电影数据库——大量JOIN练习）
- Fiftyville（侦探推理游戏——综合运用SQL技能破解案件）

> **教学用意**：Week 7 强调"数据是程序的血液"。从文件到数据库的跨越，本质上是从"自己管理数据布局"到"让数据库引擎替你优化"的跨越。

---

### Week 8: HTML, CSS, JavaScript — 互联网三件套

**官方定位**：理解Web是如何工作的——从物理层到应用层。

**知识点清单**：

**1. 互联网协议栈**

```
┌──────────────────────┐
│   Application Layer  │ HTTP, SMTP, DNS, FTP
├──────────────────────┤
│   Transport Layer    │ TCP (可靠), UDP (快速)
├──────────────────────┤
│   Internet Layer     │ IP (寻址, 路由)
├──────────────────────┤
│   Network Access     │ Ethernet, WiFi, 物理介质
└──────────────────────┘
```

**TCP/IP 握手**：
```
客户端                         服务器
  │──── SYN ────────────────────→│   "我想连接"
  │←──── SYN-ACK ───────────────│   "我准备好了"
  │──── ACK ────────────────────→│   "开始传输"
  │                              │
  │──── HTTP Request ───────────→│   "GET /index.html"
  │←──── HTTP Response ─────────│   200 OK + HTML内容
  │                              │
  │──── FIN ────────────────────→│   "再见"
  │←──── FIN-ACK ───────────────│
```

**2. DNS（域名系统）**

- `cs50.harvard.edu` → DNS查询 → IP地址（如 23.185.0.4）
- 层级结构：`.` → `.edu` → `harvard.edu` → `cs50.harvard.edu`
- 递归查询：本地DNS → 根服务器 → TLD服务器 → 权威服务器

**3. HTTP**

请求格式：
```
GET / HTTP/1.1
Host: cs50.harvard.edu
User-Agent: Mozilla/5.0
Accept: text/html
```

响应格式：
```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1234

<!DOCTYPE html>...
```

状态码：
- 2xx 成功：200 OK, 201 Created
- 3xx 重定向：301 永久, 302 临时
- 4xx 客户端错误：400 Bad Request, 403 Forbidden, 404 Not Found
- 5xx 服务端错误：500 Internal Server Error, 503 Service Unavailable

GET vs POST：
| | GET | POST |
|---|-----|------|
| 参数位置 | URL查询字符串 | 请求体 |
| 可见性 | 地址栏可见 | 不可见 |
| 长度限制 | ~2048字符 | 无限制 |
| 幂等性 | 是 | 否 |
| 用途 | 获取数据 | 提交数据 |

**4. HTML**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>页面标题</title>
    <link href="style.css" rel="stylesheet">
</head>
<body>
    <h1>标题</h1>
    <p>段落 <a href="other.html">链接</a></p>
    <img src="photo.jpg" alt="描述">
    <form action="/submit" method="post">
        <input type="text" name="username" placeholder="用户名">
        <input type="password" name="password">
        <button type="submit">提交</button>
    </form>
    <script src="script.js"></script>
</body>
</html>
```

**5. CSS**

```css
/* 选择器 */
h1 { color: darkblue; }
#unique-id { font-weight: bold; }
.class-name { background: lightgray; }

/* 组合选择器 */
ul > li { margin: 5px; }
a:hover { text-decoration: underline; }

/* 响应式设计 */
@media (max-width: 600px) {
    body { font-size: 14px; }
}
```

**6. Bootstrap 框架**

- 12列网格系统
- 预置组件：导航栏、卡片、表单、模态框
- 响应式断点：xs, sm, md, lg, xl, xxl
- 快速原型开发

**7. JavaScript**

```javascript
// 变量
let name = "Alice";
const PI = 3.14;

// 函数
function greet(name) {
    return `Hello, ${name}!`;  // 模板字符串
}

// 箭头函数
const add = (a, b) => a + b;

// 事件监听
document.querySelector('button').addEventListener('click', () => {
    alert('按钮被点击！');
});

// DOM操作
let el = document.querySelector('#output');
el.innerHTML = '<strong>动态内容</strong>';
el.style.color = 'red';
```

**8. DOM（文档对象模型）**

```
         document
            │
          <html>
          /    \
       <head>  <body>
        /       /   \
     <title>  <h1>  <p>
```

- DOM 是 HTML 文档的内存表示
- JavaScript 通过 DOM API 读写页面
- `querySelector()` 用CSS选择器查找元素
- 事件冒泡和事件委托

**9. 正则表达式（Regular Expressions）**

```python
import re
# 匹配模式
re.match(r"^\d{3}-\d{4}$", "555-1234")    # 完整匹配
re.search(r"harvard\.edu", url)             # 搜索
re.sub(r"\s+", " ", text)                   # 替换连续空格
```

特殊字符：`.` `*` `+` `?` `^` `$` `[]` `()` `|` `{}` `\d` `\w` `\s`

**Shorts 补充**：
- Internet Primer（互联网基础：IP, TCP, HTTP）
- HTML（标签语义化）
- CSS（盒模型、Flexbox、Grid）
- JavaScript（基础语法）
- DOM（文档对象模型操作）

**Problem Set 8**:
- Trivia（问答页面——HTML表单+JS事件）
- Homepage（个人主页——HTML+CSS+JS+Bootstrap综合项目）

> **教学用意**：Week 8 是"从底层到表层"的逆过程——前7周一直在往下挖（C语言→指针→内存→数据结构），现在终于回到用户看到的东西。但因为有了前7周的基础，学生看到 `<form>` 标签时想的不是"表单怎么用"，而是"HTTP POST背后发生了什么"。

---

### Week 9: Flask — Web应用的骨架

**官方定位**：用Python框架构建动态Web应用，连接前后端。

**知识点清单**：

**1. Web 框架的作用**

- 处理HTTP请求/响应
- URL路由分发
- 模板渲染
- 会话管理
- 数据库集成

**2. Flask 基础架构**

```python
from flask import Flask, render_template, request, redirect, session

app = Flask(__name__)
app.secret_key = "your-secret-key"  # 用于session加密

@app.route("/")                     # 装饰器定义路由
def index():
    return render_template("index.html", name="World")

@app.route("/greet", methods=["POST"])
def greet():
    name = request.form.get("name", "World")
    return render_template("greet.html", name=name)

if __name__ == "__main__":
    app.run(debug=True)
```

**3. 路由（Routes）**

```python
@app.route("/")              # 静态路由
@app.route("/user/<name>")   # 动态路由（路径参数）
@app.route("/post/<int:id>") # 类型约束

# URL生成
url_for('index')             # → "/"
url_for('user', name='bob')  # → "/user/bob"
```

**4. 装饰器（Decorators）的本质**

```python
@app.route("/")   # 等价于：
def index():      # index = app.route("/")(index)
    ...

# 装饰器是接受函数、返回新函数的高阶函数
```

这是Python特性，与C的函数指针理念相通但更高级。

**5. Jinja 模板引擎**

```html
<!-- layout.html -->
<!DOCTYPE html>
<html>
<head><title>{% block title %}{% endblock %}</title></head>
<body>
    {% block body %}{% endblock %}
</body>
</html>

<!-- index.html -->
{% extends "layout.html" %}
{% block title %}首页{% endblock %}
{% block body %}
    <h1>Hello, {{ name }}!</h1>
    {% if logged_in %}
        <p>欢迎回来</p>
    {% else %}
        <p><a href="/login">请登录</a></p>
    {% endif %}
    <ul>
    {% for item in items %}
        <li>{{ item }}</li>
    {% endfor %}
    </ul>
{% endblock %}
```

Jinja 语法：
- `{{ variable }}` — 输出变量
- `{% statement %}` — 控制语句
- `{# comment #}` — 注释

**6. Session（会话）**

HTTP 是无状态协议 → Session 在服务端维护状态。

```python
from flask import session

@app.route("/login", methods=["POST"])
def login():
    session["user_id"] = user_id  # 登录后存储
    return redirect("/")

@app.route("/logout")
def logout():
    session.clear()               # 清除所有session
    return redirect("/")
```

Session 实现方式：
1. **Cookie-based**：Flask默认，数据加密存储在客户端Cookie
2. **Server-side**：Session ID存Cookie，数据存服务端（Redis/DB）

**7. Cookies**

```python
resp = make_response(render_template("page.html"))
resp.set_cookie("theme", "dark", max_age=3600)  # 1小时过期
```

Cookie属性：
- `max_age` / `expires`：过期时间
- `domain`：生效域名
- `path`：生效路径
- `secure`：仅HTTPS
- `httponly`：禁止JS访问（防XSS）

**8. API 设计**

```python
@app.route("/api/users")
def api_users():
    users = db.execute("SELECT * FROM users")
    return jsonify(users)  # 返回JSON
```

RESTful 原则：
- GET /users — 列出用户
- POST /users — 创建用户
- GET /users/1 — 获取用户1
- PUT /users/1 — 更新用户1
- DELETE /users/1 — 删除用户1

**9. AJAX（异步请求）**

```javascript
fetch('/api/data')
    .then(response => response.json())
    .then(data => {
        document.querySelector('#result').innerHTML = data.html;
    });
```

- 不刷新整个页面，只更新部分内容
- 实现单页应用（SPA）的基础

**10. POST/Redirect/GET 模式**

```
用户提交表单 → POST /submit → 处理 → redirect → GET /success
                                     (303 See Other)
```

优势：刷新不会重复提交表单。

**Shorts 补充**：
- Flask（框架入门）
- AJAX（异步请求详解）

**Problem Set 9**:
- Birthdays（生日记录应用——Flask+SQLite CRUD）
- Finance（股票交易模拟器——完整的MVC应用，含注册、登录、报价、买卖、历史记录）

> **教学用意**：Week 9 是CS50的集大成者——Finance PSET 需要用到C的算法思维、Python的语法、SQL的数据库操作、HTML/CSS/JS的前端、Flask的后端框架。它是整个课程技术栈的顶点。

---

### Week 10: The End — 网络安全与展望

**官方定位**：站在技术高峰回望，前瞻安全与未来。

**知识点清单**：

**1. 网络安全核心概念**

| 概念 | 含义 | 实例 |
|------|------|------|
| 机密性 (Confidentiality) | 数据不被未授权访问 | 加密 |
| 完整性 (Integrity) | 数据不被篡改 | 数字签名、校验和 |
| 可用性 (Availability) | 系统持续可用 | DDoS防御、冗余 |

**2. 加密学基础**

**对称加密（Symmetric Encryption）**：
- 同一密钥加密和解密
- 算法：AES（Advanced Encryption Standard）
- 快，但密钥分发是问题
- 类比：同一个钥匙锁门开门

**非对称加密（Asymmetric Encryption）**：
- 公钥加密，私钥解密（或反过来）
- 算法：RSA（Rivest-Shamir-Adleman）
- 慢，但解决了密钥分发
- 类比：邮箱投递口（谁都能投，只有主人能取）

**混合方案**（TLS/SSL的做法）：
1. 用非对称加密交换对称密钥
2. 用对称密钥加密后续通信

**哈希函数**：
- 单向：输入→哈希值，无法逆转
- 确定性：同一输入永远产生同一输出
- 雪崩效应：微小输入变化导致巨大输出差异
- SHA-256：256位输出

**3. HTTPS / TLS**

客户端 ←TLS握手→ 服务器
1. 客户端发送支持的加密套件
2. 服务器选择加密方式 + 发送证书
3. 客户端验证证书（证书链 → CA根证书）
4. 交换对称密钥
5. 后续通信加密

**4. 常见攻击类型**

| 攻击 | 原理 | 防御 |
|------|------|------|
| SQL注入 | 拼接恶意SQL | 参数化查询 |
| XSS（跨站脚本） | 注入恶意JS | 输出转义、CSP |
| CSRF（跨站请求伪造） | 利用登录态伪造请求 | CSRF Token |
| 中间人攻击 | 拦截通信 | HTTPS、证书验证 |
| 暴力破解 | 遍历所有可能 | 速率限制、锁定 |
| 缓冲区溢出 | 写入越界 | 边界检查、ASLR、DEP |
| 钓鱼攻击 | 伪造网站/邮件 | 安全意识、2FA |
| DDoS | 海量请求打垮服务 | CDN、流量清洗 |

**5. 密码安全**

```python
# ❌ 明文存储
db.execute("INSERT INTO users (username, password) VALUES (?, ?)", u, p)

# ❌ 简单哈希（可彩虹表破解）
import hashlib
hash = hashlib.sha256(p.encode()).hexdigest()

# ✅ 加盐哈希
import hashlib, os
salt = os.urandom(16)
hash = hashlib.pbkdf2_hmac('sha256', p.encode(), salt, 100000)
```

- **盐（Salt）**：随机值，使相同密码产生不同哈希
- **迭代次数**：增加暴力破解成本
- **bcrypt / argon2**：现代密码哈希算法

**6. 最终项目（Final Project）**

CS50的毕业设计，要求：
- 使用课程中学到的技能
- 可以是Web应用、iOS/Android应用、游戏、数据分析...
- 录制2分钟演示视频
- 提交到 Gallery of Final Projects

**7. 课程之外的展望**

- 函数式编程（Functional Programming）
- 并发与并行（Concurrency）
- 机器学习（Machine Learning）
- 分布式系统（Distributed Systems）
- 课程推荐：CS50 AI, CS50 Web, CS50 Cybersecurity

**Seminars**: 涵盖Git、React Native、AI/ML等专题

**Problem Set 10**: 无（替换为 Final Project）

> **教学用意**：Week 10 是CS50的"毕业典礼"——把武器交给学生，同时告诉他们武器的危险。安全不是附加品，是每个程序员的基本素养。

---

## 三、CS50 教学哲学深度解析

### 为什么从 C 开始？

这是CS50最常被问到的问题。Malan教授的选择背后有深刻的课程设计逻辑：

**1. "理解水的存在"**

鱼不知道自己在水里。用Python/Java入门的学生不知道内存、指针、编译过程的存在——它们被语言隐藏了。C强迫你直面这些：

- 你写的 `string s = "hello"` 背后是什么？ → 字符数组 + `\0` + 指针
- 你的变量存在哪里？ → 栈还是堆？谁负责释放？
- 程序怎么从文本变成可执行文件？ → 预处理→编译→汇编→链接

用C入门，学生不是"先学会游泳，再学水流"，而是直接跳进底层，理解计算机的真实运行机制。

**2. 建立"不信任抽象"的思维习惯**

```python
# Python 程序员
names = ["Alice", "Bob", "Charlie"]  # "这是list啊，有什么不对？"

# CS50 毕业生
# list = 动态数组，append时可能realloc
# 哈希表底层，O(1)查找是均摊的
# 内存由GC管理，不是不需要管理
```

经历过C的折磨后，用Python时不会被便利性蒙蔽——你知道每个高层抽象下的代价。

**3. "螺旋式课程"而非"线性课程"**

CS50不是"学完A再学B"的线性模式，而是螺旋上升：

```
Week 0:  建立抽象和算法的直观模型（Scratch）
Week 1-5: 用C实现这些模型，理解计算机底层
Week 6:   用Python重新实现，发现"啊，这个库就是我在Week 5写的！"
Week 7-9: 构建完整的Web应用，连接所有知识点
Week 10:  安全 + 展望 + 毕业项目
```

同一个概念（如"哈希表"）经历三次迭代：
1. Week 0: 用撕电话簿的比喻理解
2. Week 5: 用C手动实现链表法
3. Week 6: 用Python的 `dict`，但理解底层是什么

**4. 难度曲线的刻意设计**

CS50遵循"先难后易"的哲学：
- Weeks 1-5（C语言阶段）是最困难的——指针、malloc、段错误
- Weeks 6-9 逐步"解锁"更高级的工具，学生感到的只有轻松

这种设计让学生在最精力充沛的学期初攻克最难的关卡，后续越学越轻松。如果反过来（先Python后C），学生会经历"伪轻松→真痛苦"的转折。

**5. "不止教编程，而是教你如何自学新语言"**

CS50官网明确写道："More than teach you how to program in one language, this course teaches you how to program fundamentally and how to teach yourself new languages ultimately."

课程教了 Scratch、C、Python、SQL、HTML、CSS、JavaScript、Flask，但这不是为了让学生成为"什么都懂一点"的通才。而是让学生经历多次"从零学新语言"的过程，建立自学的信心和方法论。

**6. 课程设计中的心理学**

- **Problem Set 0（Scratch）**：零门槛，让所有人有成就感
- **Problem Set 4（图像处理）**：可视化结果极具满足感，激励学生挺过最难的指针阶段
- **Problem Set 7（Fiftyville侦探游戏）**：用游戏化设计让枯燥的SQL练习变得有趣
- **Problem Set 9（股票交易）**：完整的实际项目，给学生"我能做真正的项目了"的信心
- **Final Project**：完全自主，学生可以用技术创造自己热爱的东西

---

## 四、复习速查表

### 编译过程

```
.c → (预处理器) → .i → (编译器) → .s → (汇编器) → .o → (链接器) → 可执行文件
```

### 内存布局速记

| 区域 | 存储内容 | 管理方式 | 方向 |
|------|---------|---------|------|
| Stack | 局部变量、函数帧 | 自动 | ↓ 向下增长 |
| Heap | malloc分配 | 手动 | ↑ 向上增长 |
| Data | 全局/静态变量 | 自动 | 固定 |
| Text | 程序代码 | 只读 | 固定 |

### 复杂度速查表

| 算法/结构 | 平均查找 | 平均插入 | 平均删除 | 最坏查找 |
|----------|---------|---------|---------|---------|
| 数组 | O(1) | O(n) | O(n) | O(1) |
| 单向链表 | O(n) | O(1)头 | O(1)头 | O(n) |
| 跳表 | O(log n) | O(log n) | O(log n) | O(n) |
| BST | O(log n) | O(log n) | O(log n) | O(n) |
| 哈希表 | O(1) | O(1) | O(1) | O(n) |
| Trie | O(k) | O(k) | O(k) | O(k) |

### C 常用函数速查

| 函数 | 头文件 | 用途 |
|------|--------|------|
| `printf()` | stdio.h | 格式化输出 |
| `scanf()` | stdio.h | 格式化输入 ⚠️ |
| `malloc()` | stdlib.h | 堆内存分配 |
| `free()` | stdlib.h | 释放堆内存 |
| `strlen()` | string.h | 字符串长度 |
| `strcmp()` | string.h | 字符串比较 |
| `strcpy()` | string.h | 字符串复制 ⚠️ |
| `fopen()` | stdio.h | 打开文件 |
| `fclose()` | stdio.h | 关闭文件 |
| `atoi()` | stdlib.h | 字符串→整数 |

### Python vs C 对照

| 任务 | C | Python |
|------|---|--------|
| 打印 | `printf("hi\n");` | `print("hi")` |
| 循环 | `for (int i=0; i<10; i++)` | `for i in range(10):` |
| 条件 | `if (x > 0) { ... }` | `if x > 0:` |
| 数组 | `int a[10];` | `a = []` 或 `[0]*10` |
| 字典 | 无（需自己实现） | `d = {"a": 1}` |
| 字符串拼接 | `strcat()` 或指针操作 | `s1 + s2` |
| 文件读 | `FILE *f; fgetc()` | `with open() as f:` |

### SQL 速查

```sql
-- 基本查询
SELECT col1, col2 FROM table WHERE condition ORDER BY col LIMIT n;

-- 聚合
SELECT col, COUNT(*), AVG(x), SUM(x), MAX(x), MIN(x)
FROM table GROUP BY col HAVING COUNT(*) > 5;

-- 连接
SELECT a.col, b.col
FROM table_a a
JOIN table_b b ON a.id = b.a_id;

-- 修改
INSERT INTO table (col1, col2) VALUES (val1, val2);
UPDATE table SET col = val WHERE condition;
DELETE FROM table WHERE condition;

-- 索引
CREATE INDEX idx_name ON table(col);
```

### HTTP 状态码

| 范围 | 含义 | 常见码 |
|------|------|--------|
| 1xx | 信息 | 100 Continue |
| 2xx | 成功 | 200 OK, 201 Created, 204 No Content |
| 3xx | 重定向 | 301 永久, 302 临时, 304 Not Modified |
| 4xx | 客户端错 | 400 Bad Request, 403 Forbidden, 404 Not Found |
| 5xx | 服务端错 | 500 Internal Error, 502 Bad Gateway, 503 Unavailable |

### 安全攻防速查

| 攻击 | 一句话 | 一句话防御 |
|------|--------|-----------|
| SQL注入 | 拼接用户输入到SQL | 参数化查询 |
| XSS | 注入恶意JS到页面 | 输出转义+ CSP |
| CSRF | 利用你的登录态发请求 | CSRF Token |
| 中间人 | 截获你的通信 | HTTPS |
| 暴力破解 | 试遍所有密码 | 速率限制+ 锁定 |
| 密码泄露 | 数据库被盗 | 哈希+盐+迭代 |

---

## 五、学习建议

### 如果你是零基础

1. Week 0-5 是最大挑战，不要跳课，不要跳过PSET
2. 指针和内存管理多画图，用 pen+paper 画出地址和指向关系
3. 善用 debug50 和 valgrind，它们是你在黑暗中的手电筒
4. 善用 CS50 Duck（AI助教），24/7随时提问
5. 加入 CS50 Discord/Reddit 社区，别人的问题可能就是你的问题

### 如果你有编程基础

1. 重点关注 Week 3（算法分析）和 Week 4（内存布局）——这些是CS50最深的部分
2. Week 6（Python）不是"学Python"，是"从底层视角重新理解Python"——带着C的经验读Python文档
3. Week 7（SQL）的 Fiftyville PSET 不可跳过，是课程设计的高光时刻
4. Week 9（Finance PSET）是集大成者——把它当作对自己11周学习的全面检验

### 关键能力自检

学完CS50后，你应该能回答：

- [ ] `printf("hello")` 从源码到屏幕输出经历了什么？（编译+链接+系统调用+终端渲染）
- [ ] `int* p = malloc(sizeof(int))` 在内存中发生了什么？（堆分配+指针赋值）
- [ ] `dict` 为什么能 O(1) 查找？（哈希函数+碰撞处理）
- [ ] 浏览器输入URL后发生了什么？（DNS→TCP→TLS→HTTP→服务器→渲染）
- [ ] 如何安全存储密码？（哈希+盐+迭代）
- [ ] 什么是 SQL 注入？如何防御？（参数化查询）
- [ ] 归并排序为什么是 O(n log n)？（分治+递归树分析）

---

## 附录：资源链接

- **课程官网**：https://cs50.harvard.edu/x/2025/
- **2025 vs 2026**：2026版本已发布 https://cs50.harvard.edu/x/2026/
- **YouTube 播放列表**：https://www.youtube.com/playlist?list=PLhQjrBD2T383q7Vn8QnTsVgSvyLpsqL_R
- **CS50.ai（AI助教）**：https://cs50.ai/
- **CS50.dev（VS Code在线环境）**：https://cs50.dev/
- **edX 注册**：https://cs50.edx.org/
- **Manual Pages**：https://manual.cs50.io/
- **Style Guide（C）**：https://cs50.readthedocs.io/style/c/
- **Discord 社区**：https://discord.gg/cs50
- **Reddit 社区**：https://www.reddit.com/r/cs50/

---

*本文档基于 Harvard CS50x 2025 课程官网内容深度分析整理，所有知识点均来自官方课程大纲、讲座笔记（Lecture Notes）、短视频（Shorts）、习题集（Problem Sets）和 David J. Malan 教授的教学设计。*
