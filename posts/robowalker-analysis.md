---
title: "RoboWalker 2024 步兵机器人电控分析"
date: 2026-05-30
tags:
  - RoboMaster
  - STM32
  - 嵌入式
  - 舵轮底盘
description: USTC-RoboWalker 步兵机器人电控工程七层架构分析，涵盖舵轮底盘运动学/动力学、云台控制、发射机构、PID 算法等。
---

# RoboWalker 2024 步兵机器人电控系统 — 深度源码分析总结

> **项目**: robowalker2024bottominfantry
> **团队**: USTC-RoboWalker (中国科学技术大学)
> **分析引擎**: deepseek-v4-pro
> **分析日期**: 2026-05-30
> **源码行数**: 68个源文件 (~20,000+ 行 C/C++)

---

## 目录

1. [工程总览与硬件拓扑](#1-工程总览与硬件拓扑)
2. [七层架构逐层深度剖析](#2-七层架构逐层深度剖析)
3. [核心算法数学推导与实现](#3-核心算法数学推导与实现)
4. [PID 控制器的卓越实现](#4-pid-控制器的卓越实现)
5. [有限状态机设计模式](#5-有限状态机设计模式)
6. [滤波器: Fourier FIR 与 Kalman](#6-滤波器-fourier-fir-与-kalman)
7. [底盘舵轮控制流水线详解](#7-底盘舵轮控制流水线详解)
8. [功率管理的工程智慧](#8-功率管理的工程智慧)
9. [发射机构: 防卡弹与热量管理](#9-发射机构-防卡弹与热量管理)
10. [云台双环控制与重力前馈](#10-云台双环控制与重力前馈)
11. [姿态感知与坐标变换](#11-姿态感知与坐标变换)
12. [视觉追踪的增量式架构](#12-视觉追踪的增量式架构)
13. [裁判系统协议解析与UI绘制](#13-裁判系统协议解析与ui绘制)
14. [任务调度: 时间触发架构](#14-任务调度-时间触发架构)
15. [学到的工程技巧与设计智慧](#15-学到的工程技巧与设计智慧)

---

## 1. 工程总览与硬件拓扑

### 1.1 项目定位

本项目是中国科学技术大学 RoboWalker 战队参加 **RoboMaster 机甲大师赛** 的步兵机器人底层电控系统。运行于 **STM32F427IIHx** (Cortex-M4, 带 FPU), 使用 **arm-none-eabi-g++** 交叉编译, C++17 标准。

### 1.2 编译器与构建配置

```cmake
# CMakeLists.txt 关键配置
set(CMAKE_CXX_STANDARD 17)
add_compile_definitions(ARM_MATH_CM4;ARM_MATH_MATRIX_CHECK;ARM_MATH_ROUNDING;__FPU_PRESENT=1)
add_compile_options(-mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16)
add_compile_options(-Ofast -g)  # 全速优化
```

依赖库: CMSIS-DSP (arm_cortexM4lf_math), Eigen 3.3.9 (矩阵运算)

### 1.3 硬件拓扑

```
                    ┌──────────────────────────┐
                    │   STM32F427IIHx @ 168MHz  │
                    │   1MB Flash, 256KB SRAM   │
                    └──┬───┬───┬───┬───┬───┬───┘
                       │   │   │   │   │   │
    ┌──────────────────┘   │   │   │   │   └──────────────┐
    │                      │   │   │   │                  │
  CAN1 (1Mbps)          CAN2 (1Mbps)  │   UART7/WHEELTEC  UART6/Referee
  ├─Yaw GM6020          ├─Steer×4     │   UART8/WIT       UART3/Manifold
  ├─Pitch GM6020        ├─Wheel×4     │   UART1/DR16      UART2/Serialplot
  ├─Friction L C620     └─Supercap    │
  ├─Friction R C620                   │
  └─Driver C610
```

**时钟树**: HSE(12MHz) → PLLM=6, PLLN=168, PLLP=2, PLLQ=7 → SYSCLK=168MHz, APB1=42MHz, APB2=84MHz

**电机ID与CAN总线分配**: (已从 architecture_analysis.md 完整获取, 此处列出以保持文档完整性)

| 电机 | CAN总线 | ID | 控制模式 | 机械零点偏移 |
|------|---------|-----|----------|-------------|
| 舵向[0] | CAN2 | 0x207 | ANGLE | 1696 |
| 舵向[1] | CAN2 | 0x208 | ANGLE | -3145 |
| 舵向[2] | CAN2 | 0x205 | ANGLE | -1025 |
| 舵向[3] | CAN2 | 0x206 | ANGLE | 3732 |
| 轮向[0] | CAN2 | 0x203 | CURRENT | 减速比 268/17 |
| 轮向[1] | CAN2 | 0x204 | CURRENT | 减速比 268/17 |
| 轮向[2] | CAN2 | 0x201 | CURRENT | 减速比 268/17 |
| 轮向[3] | CAN2 | 0x202 | CURRENT | 减速比 268/17 |
| Yaw轴 | CAN1 | 0x205 | ANGLE | - |
| Pitch轴 | CAN1 | 0x206 | ANGLE | - |
| 摩擦轮左 | CAN1 | 0x204 | OMEGA | - |
| 摩擦轮右 | CAN1 | 0x203 | OMEGA | - |
| 拨弹盘 | CAN1 | 0x202 | ANGLE | - |

---

## 2. 七层架构逐层深度剖析

### 2.1 架构概览

```
Layer 7: Task Scheduler (tsk_)              ← 硬件定时器中断驱动
Layer 6: Interaction (ita_)                 ← 机器人行为决策
Layer 5: Posture (crt_posture)              ← 多传感器融合
Layer 4: Chariot Module (crt_chassis/gimbal/booster) ← 运动控制
Layer 3: Device (dvc_)                      ← 协议封装
Layer 2: Algorithm Middleware (alg_)        ← 可复用算法
Layer 1: Driver HAL Wrapper (drv_)          ← 硬件抽象
```

**单向依赖法则**: 上层依赖下层, 下层绝对不依赖上层。每个类明确标注 `Specialized` / `Reusable` / `Generic`。

### 2.2 第1层: 驱动层 — HAL 的面向对象封装

#### CAN 驱动 (`drv_can`)

**设计亮点**:
- 使用掩码滤波器配置实现全接收 (`ID=0, Mask=0`), 由上层回调按 ID 分发
- CAN1 和 CAN2 各一个 `Struct_CAN_Manage_Object`, 通过全局变量暴露
- `TIM_1ms_CAN_PeriodElapsedCallback()` 中 CAN2 舵向和轮向电机以 **2ms 周期发送**, CAN1 云台和发射电机以 **1ms 周期发送** (通过静态 `mod2` 计数器分频)

```cpp
// 核心分频逻辑 (drv_can.cpp)
void TIM_1ms_CAN_PeriodElapsedCallback()
{
    static int mod2 = 0;
    mod2++;
    if (mod2 == 2) {
        mod2 = 0;
        CAN_Send_Data(&hcan2, 0x1fe, CAN2_0x1fe_Tx_Data, 8); // 舵向
        CAN_Send_Data(&hcan2, 0x200, CAN2_0x200_Tx_Data, 8); // 轮向
    }
    CAN_Send_Data(&hcan1, 0x200, CAN1_0x200_Tx_Data, 8); // 摩擦轮+拨弹
    CAN_Send_Data(&hcan1, 0x1fe, CAN1_0x1fe_Tx_Data, 8); // 云台
}
```

#### UART 驱动 (`drv_uart`)

**设计亮点**:
- 统一的 `Struct_UART_Manage_Object` (含 512 字节收发缓冲 + 回调指针)
- DMA 空闲中断接收, `UART_Reinit()` 支持断线重连
- `TIM_1ms_UART_PeriodElapsedCallback()` 为串口绘图提供高速发送通道

#### 数学工具 (`drv_math`)

**关键技术实现**:

1. **`Math_Modulus_Normalization`** — 角度归一化核心函数:
```cpp
// 将任意角度映射到 ±modulus/2 范围内
// 例如 modulus=PI*2 时, 输入 400° 输出 40°, 输入 -200° 输出 160°
template<typename Type>
Type Math_Modulus_Normalization(Type x, Type modulus) {
    float tmp = fmod(x + modulus / 2.0f, modulus);
    if (tmp < 0.0f) tmp += modulus;
    return (tmp - modulus / 2.0f);
}
```

2. **`Math_Sinc`** — sinc 函数实现:
```cpp
// 分母接近零时使用极限值 lim_{x→0} sin(x)/x = 1
float Math_Sinc(float x) {
    if (Math_Abs(x) <= 2.0f * FLT_EPSILON) return 1.0f;
    return arm_sin_f32(x) / x;
}
```

3. **线性映射**: `Math_Float_To_Int` / `Math_Int_To_Float` 将浮点区间映射到定点区间

### 2.3 第2层: 算法中间件层

详见后续各独立章节: PID (第4节)、FSM (第5节)、滤波器 (第6节)、斜坡函数 (第7节)、队列、定时器

### 2.4 第3层: 设备层

#### DJI 电机封装 (`dvc_motor_dji`)

**继承层次**:
```
Class_Motor_DJI (基类)
├── Class_Motor_DJI_GM6020   → 角度伺服
├── Class_Motor_DJI_C620     → 电流/速度控制
└── Class_Motor_DJI_C610     → 电流控制
```

**核心方法**:
- `CAN_Register_Callback()` — 将特定 CAN ID 的消息路由到对应的电机实例
- `Set_Target_Angle/Omega/Current()` — 控制目标写入
- `Set_Power_Factor(float factor)` — 功率因数削减 (0.0~1.0)
- `Get_Power_Estimate()` — 根据目标电流和转速预估当前功率消耗

**控制模式枚举**:
- `DJI_Motor_Control_Method_ANGLE` — 角度伺服 (位置环)
- `DJI_Motor_Control_Method_OMEGA` — 角速度伺服 (速度环)
- `DJI_Motor_Control_Method_CURRENT` — 电流/扭矩控制 (开环)

**功率预估算法** (用于底盘功率限制的输入):
- 通过设定目标电流 `Target_Torque_Current` 和实际转速 `Now_Omega` 计算预估功率
- 再由 `Set_Power_Factor()` 动态削减

#### DR16 遥控器 (`dvc_dr16`)

**18字节协议解析**:
- 4通道摇杆各11bit (0~1684), 映射到 [-1, 1]
- 2路拨动开关: 支持 `UP → MIDDLE → DOWN` 全路径状态检测
- 鼠标坐标: ±32768 范围
- 键盘按键: 16位位掩码

**按键状态机** (在 ita_robot 层通过 `Class_FSM_Press_Hold` 实现):
```
STOP → FREE → PRESSED → CLICK → STOP (短按)
                    └→ HOLD → STOP (长按)
```

#### Manifold 视觉模块 (`dvc_manifold`)

**接收数据帧** (视觉 → 控制板):
```cpp
struct Struct_Manifold_UART_Rx_Data {
    uint8_t Frame_Header;          // 帧头
    uint8_t Shoot_Flag;            // 自动开火标志
    float Pitch_Angle_Increment;   // Pitch增量 (rad)
    float Yaw_Angle_Increment;     // Yaw增量 (rad)
    float Pitch_Omega_FeedForward; // Pitch角速度前馈
    float Yaw_Omega_FeedForward;   // Yaw角速度前馈
    uint8_t Enemy_ID;              // 目标ID
    uint8_t Confidence_Level;      // 算法置信度
    uint8_t Checksum;              // 校验和
};
```

**发送数据帧** (控制板 → 视觉):
```cpp
struct Struct_Manifold_UART_Tx_Data {
    uint8_t Frame_Header;
    uint8_t Enemy_Color;           // 敌方颜色
    uint8_t Aiming_Priority;       // 自瞄优先级
    float Velocity_X, Velocity_Y;  // 底盘速度 (弹道补偿)
    uint8_t Checksum;
};
```

**安全设计**:
- 角度增量受限: `Gimbal_Pitch_Angle_Increment_Max = ±30°`, `Gimbal_Yaw_Angle_Increment_Max = ±60°`
- `isnormal()` 检查防止 NaN/Inf 污染

#### 裁判系统 (`dvc_referee`)

这是项目中体量最大的头文件 (2928行)。实现了完整的 RoboMaster 裁判系统协议:

**关键数据流**:
| 命令ID | 频率 | 数据内容 | 工程用途 |
|--------|------|----------|----------|
| 0x0001 | 3Hz | 比赛状态/阶段/时间戳 | 比赛阶段判定 |
| 0x0201 | 10Hz | HP/等级/功率/热量上限 | 功率限制源, 等级选择 |
| 0x0202 | 50Hz | 底盘电压/电流/功率, 发射热量 | 功率监控, 热量管理 |
| 0x0203 | 10Hz | 机器人位置 X/Y/Yaw | 定位数据 |
| 0x0206 | 事件 | 受攻击信息 | 伤害检测 |
| 0x0207 | 射击 | 弹速/射速 | 发射统计 |

**UI 绘制 API**: 支持直线/矩形/圆/椭圆/圆弧/浮点数/整数/字符串8种图形, 用于操作手客户端实时状态显示。

#### 串口绘图 (`dvc_serialplot`)

**设计精妙之处**: 不仅支持数据发送, 还支持 **在线PID参数接收**:
```cpp
// 通过 UART2 接收 "variable=value#" 格式的调参指令
// 例如 "Yaw_Angle_P=5.3#" → 查找字典 → 修改对应 PID 参数
```
字典包含6个条目: Yaw轴角度环P/I/D 和 角速度环P/I/D

### 2.5 第4-7层: 战车模块、姿态、交互、任务调度

详见第7-14节各专题分析。

---

## 3. 核心算法数学推导与实现

### 3.1 舵轮底盘正运动学 (Self_Resolution)

从四个轮的实际运动反推底盘整体运动:

```
已知: 每个轮的线速度 ωᵢ、舵向角度 θᵢ、位置角 αᵢ (轮组安装方位角)
轮径 R, 轮距中心距离 d = 0.207m

Vx = (1/4) × Σ ωᵢ × cos(θᵢ) × R
Vy = (1/4) × Σ ωᵢ × sin(θᵢ) × R
Ω  = -(1/4) × Σ (ωᵢ × R × sin(θᵢ - αᵢ)) / d
```

**AHRS增强**: 利用底盘陀螺仪 (WHEELTEC) 的角度数据修正 Ω 和 Pitch/Roll 姿态角。

### 3.2 舵轮底盘逆运动学 (Kinematics_Inverse_Resolution)

从目标 Vx/Vy/Ω 分解为每个轮的速度矢量:

```
对第 i 个轮 (安装方位角 αᵢ, 轮距中心距离 d):

vxᵢ = Vx + Ω × d × sin(αᵢ)    # 平动 + 转动切向分量
vyᵢ = Vy - Ω × d × cos(αᵢ)

θ_targetᵢ = atan2(vyᵢ, vxᵢ)   # 目标舵向角
ω_targetᵢ = sqrt(vxᵢ² + vyᵢ²) / R  # 目标轮角速度
```

### 3.3 就近转位优化 (Nearest Transposition)

这是舵轮底盘的**核心优化**。每个舵向电机存在 ±180° 对称性:

```
Δθ = θ_target - θ_now (归一化到 ±180°)

If |Δθ| ≤ 90°:
    θ_command = Δθ           # 直接转到目标
    ω_command = ω_target     # 轮速不变

If |Δθ| > 90°:
    θ_command = Δθ - sign(Δθ) × 180°   # 反向转到虚拟目标
    ω_command = -ω_target              # 轮速取反 (扣圈)
```

**工程价值**: 避免舵向电机"绕远路", 显著减少转向时间和能量消耗。

### 3.4 逆动力学与扭矩分配 (Dynamics_Inverse_Resolution)

```
速度环 PID 输出: Fx, Fy, Tz (底盘坐标系的力和扭矩)

对第 i 个轮:
τᵢ = [Fx × cos(θᵢ) + Fy × sin(θᵢ) - Tz/d × sin(αᵢ - θᵢ)] × R
    └─────────────┬──────────────┘   └──────────┬─────────┘
              推力分量                    转动扭矩分量
```

**摩擦力补偿项**: 参考底盘摩擦力.xlsx 数据, 对每个轮的方向做额外补偿。

### 3.5 云台双环控制级联

```
目标角度 → [位置环PID] → 目标角速度 → [速度环PID] → 扭矩 → 电机
                 ↑                           ↑
            编码器反馈               陀螺仪角速度反馈
```

在 `crt_gimbal_motor.cpp` 中实现:
- **位置环** (`PID_Angle`): 以编码器角度为反馈
- **速度环** (`PID_Omega` 或 `PID_AHRS_Omega`): 以编码器微分角速度 / AHRS 角速度为反馈
- AHRS在线时使用陀螺仪角速度反馈 (精度更高), 离线时自动降级为编码器微分
- **重力前馈**: Pitch 轴根据当前角度计算重力力矩, 直接叠加到输出

### 3.6 发射机构弹道

```
摩擦轮恒速: ~700 rad/s (闭环OMEGA模式)
     ↑
拨弹盘: 每发=360°/7=51.43° (7发/圈)
     ↑
热量管理: 裁判热量数据 → 分级控制
```

---

## 4. PID 控制器的卓越实现

### 4.1 初始化接口设计

```cpp
void Class_PID::Init(
    float __K_P,                    // 比例
    float __K_I,                    // 积分
    float __K_D,                    // 微分
    float __K_F = 0.0f,             // 前馈系数
    float __I_Out_Max = 0.0f,       // 积分限幅 (0=不限制)
    float __Out_Max = 0.0f,         // 输出限幅 (0=不限制)
    float __D_T = 0.001f,           // 控制周期 (秒)
    float __Dead_Zone = 0.0f,       // 死区
    float __I_Variable_Speed_A = 0.0f,  // 变速积分定速段
    float __I_Variable_Speed_B = 0.0f,  // 变速积分变速段
    float __I_Separate_Threshold = 0.0f,// 积分分离阈值
    Enum_PID_D_First __D_First = PID_D_First_DISABLE // 微分先行
);
```

12个参数, 提供3个级别: 基础PID (前3个) → 带限幅 → 带变速积分/积分分离 → 微分先行/前馈。

### 4.2 核心计算流程 (逐行解析)

```cpp
void Class_PID::TIM_Calculate_PeriodElapsedCallback()
{
    // 1. 误差计算
    error = Target - Now;
    abs_error = Math_Abs(error);

    // 2. 死区处理 — 误差在死区内不响应
    //    (同时做不对称死区: 正侧 -Dead_Zone, 负侧 +Dead_Zone)
    if (abs_error < Dead_Zone) {
        Target = Now; error = 0; abs_error = 0;
    } else if (error > 0) {
        error -= Dead_Zone;    // 正误差缩小死区量
    } else {
        error += Dead_Zone;    // 负误差缩小死区量
    }

    // 3. P项
    p_out = K_P * error;

    // 4. 变速积分系数
    //    error在 [0, A]: speed_ratio=1.0 (全速积分)
    //    error在 (A, B): speed_ratio 线性从1.0降到0.0
    //    error在 [B, ∞): speed_ratio=0 (停止积分)
    if (abs_error <= I_Variable_Speed_A)       speed_ratio = 1.0f;
    else if (abs_error < I_Variable_Speed_B)   speed_ratio = (B - error) / (B - A);
    else                                       speed_ratio = 0.0f;

    // 5. 积分限幅 (保护积分值不超出范围)
    if (I_Out_Max != 0)
        Math_Constrain(&Integral_Error, -I_Out_Max / K_I, I_Out_Max / K_I);

    // 6. 积分分离
    if (abs_error < I_Separate_Threshold) {
        Integral_Error += speed_ratio * D_T * error;  // 正常积分
        i_out = K_I * Integral_Error;
    } else {
        Integral_Error = 0.0f;    // 清零积分
        i_out = 0.0f;
    }

    // 7. D项
    if (D_First == PID_D_First_DISABLE)
        d_out = K_D * (error - Pre_Error) / D_T;  // 对误差微分
    else
        d_out = -K_D * (Now - Pre_Now) / D_T;     // 微分先行: 对当前值微分

    // 8. 前馈
    f_out = K_F * (Target - Pre_Target);

    // 9. 合成 + 输出限幅
    Out = p_out + i_out + d_out + f_out;
    if (Out_Max != 0) Math_Constrain(&Out, -Out_Max, Out_Max);

    // 10. 状态保存
    Pre_Now = Now; Pre_Target = Target; Pre_Error = error;
}
```

### 4.3 六大特性的工程意义

| 特性 | 解决的问题 | 典型场景 |
|------|-----------|----------|
| **死区** | 消除稳态抖动 | 底盘零速时消除电机微振 |
| **变速积分** | 大误差时不积累积分 | 目标突变时的平滑过渡 |
| **积分分离** | 避免大误差时积分饱和 | 底盘跟随模式初始追偏 |
| **微分先行** | 目标突变不产生微分冲击 | 云台目标角度跳变 |
| **前馈** | 提高响应速度 | 视觉追踪的角速度前馈 |
| **输出限幅** | 保护执行器 | 电机电流不超过最大值 |

### 4.4 项目中PID的使用全景

- 底盘: 3个PID (Vx/Vy/Ω速度环)
- 每个舵向: 1个PID (角度环, 在Motor_DJI_GM6020 内部)
- 每个云台电机: 2个PID (位置环 + 速度环)
- 交互层: 3个PID (底盘跟随Yaw、电容功率、裁判功率限制)
- 合计: **约 20+ 个PID实例**

---

## 5. 有限状态机设计模式

### 5.1 基类设计 (`alg_fsm`)

```cpp
#define STATUS_MAX 10

class Class_FSM {
    Struct_Status Status[STATUS_MAX];  // 状态数组
    uint8_t Now_Status_Serial;         // 当前状态编号

    void Set_Status(uint8_t next) {
        Status[Now_Status_Serial].Status_Stage = DISABLE;  // 失能旧状态
        Status[Now_Status_Serial].Count_Time = 0;          // 清零计数器
        Status[next].Status_Stage = ENABLE;                // 使能新状态
        Now_Status_Serial = next;
    }

    void TIM_Calculate_PeriodElapsedCallback() {
        Status[Now_Status_Serial].Count_Time++;  // 当前状态计时
        // 子类在此实现状态转移
    }
};
```

### 5.2 防卡弹 FSM (`Class_FSM_Anti_Jamming`)

```
NORMAL ──(扭矩>9.5 持续500ms)──→ JAMMING_SUSPECT
                                          │
                                    ┌─────┘
                                    ↓
                            JAMMING_CONFIRM ──→ PROCESSING
                                                      │
                                            (反向转30° 持续300ms)
                                                      │
                                                      ↓
                                                    NORMAL
```

**巧妙之处**:
- `JAMMING_SUSPECT` 是一个缓冲态, 避免瞬时扭矩尖峰误触发
- `PROCESSING` 反向旋转拨弹盘 30°, 利用弹性势能使卡弹脱离
- 整个过程在 `TIM_10ms_Calculate_PeriodElapsedCallback()` 中以 100Hz 执行

### 5.3 按键长按检测 (`Class_FSM_Press_Hold`)

```
STOP ──(按键按下)──→ FREE (延迟去抖) ──→ PRESSED
                                              │
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                              (松开<阈值)          (按住>阈值)
                               CLICK                  HOLD
                                    ↓                   ↓
                                   STOP               STOP
```

用于鼠标左键: 短按=点射, 长按=连发。`Count_Time` 记录按下时长, 阈值判断。

### 5.4 热量自检测 (`Class_FSM_Heat_Detector`)

通过队列积分拨弹盘电机的电流:
- ON状态下: 持续检测电流窗口积分是否超过阈值 → 判定为真实射击
- OFF状态下: 等待热量降到安全值后自动回到 ON

**设计意图**: 当裁判系统断连时, 自行估算发射热量。

---

## 6. 滤波器: Fourier FIR 与 Kalman

### 6.1 Fourier FIR 滤波器

**模板设计**: `Class_Filter_Fourier<Filter_Fourier_Order>` — 阶数编译期可配。

**初始化 — 系统函数计算**:

使用 **sinc 加窗法** 设计 FIR 滤波器。以低通为例:
```
omega_low = 2π × f_low / f_sample   (归一化截止频率)

对 k = 0..Order:
    h[k] = (omega_low / π) × sinc((k - Order/2) × omega_low)

    h_norm[k] = h[k] / Σ h   (归一化, 保证DC增益=1)
```

**运行时 — 卷积**:
```cpp
void TIM_Calculate_PeriodElapsedCallback() {
    Out = 0.0f;
    for (int i = 0; i < Order + 1; i++)
        Out += System_Function[i] * Input_Signal[(Signal_Flag + i) % (Order + 1)];
}
```

使用环形缓冲区 `Input_Signal[]` 和 `Signal_Flag` 实现 O(Order) 的滑动窗口卷积。

**滤波器类型** (通过 sinc 组合实现):
| 类型 | 公式 |
|------|------|
| 低通 | h_LP[n] = ωc/π × sinc(n×ωc) |
| 高通 | h_HP[n] = sinc(n×π) - h_LP[n] |
| 带通 | h_BP[n] = h_LP_high[n] - h_LP_low[n] |
| 带阻 | h_BS[n] = sinc(n×π) + h_LP_low[n] - h_LP_high[n] |

**应用场景**: 摩擦轮电机角速度的低通滤波, 滤除编码器高频噪声。

### 6.2 Kalman 滤波器

**一维简化 Kalman**:
```cpp
void TIM_Calculate_PeriodElapsedCallback() {
    Kalman_Gain = Error_Estimate / (Error_Estimate + Error_Measure);
    Out = Out + Kalman_Gain * (Now - Out);
    Error_Estimate = (1 - Kalman_Gain) * Error_Estimate;
}
```

**工作原理**:
1. 增益 = 估计不确定性 / (估计不确定性 + 测量噪声)
2. 当测量噪声大时增益小 (更信任模型预测), 当估计不确定大时增益大 (更信任测量)
3. 每次迭代后减小估计不确定性 (收敛)

**关键**: 这是一个**自收敛**的滤波器 —— 随着数据增加, `Error_Estimate` 单调递减, `Kalman_Gain` 趋向0。

---

## 7. 底盘舵轮控制流水线详解

### 7.1 六步流水线 (2ms 周期)

```
┌─ Step 1: Self_Resolution ─────────────────────────────┐
│ 正运动学: 4个轮的实际运动 → 底盘 Vx/Vy/Ω            │
│ + AHRS角度解算 + 斜率方向向量 + 实时功率统计          │
├─ Step 2: Kinematics_Inverse_Resolution ────────────────┤
│ 逆运动学: 目标 Vx/Vy/Ω → 每轮的目标舵角和轮速        │
│ vxᵢ=Vx+Ω×d×sin(αᵢ), vyᵢ=Vy-Ω×d×cos(αᵢ)         │
│ θᵢ=atan2(vyᵢ, vxᵢ), ωᵢ=|vᵢ|/R                  │
├─ Step 3: _Steer_Motor_Nearest_Transposition ───────────┤
│ 就近转位: Δθ≤90°→直转, else→反180°+轮速取反       │
├─ Step 4: Output_To_Dynamics ───────────────────────────┤
│ 速度环PID: Fx=Kp×(Vx_target-Vx_now)+KI∫+KDd/dt     │
│             Fy, Tz 同理                                │
├─ Step 5: Dynamics_Inverse_Resolution ──────────────────┤
│ 逆动力学: Fx/Fy/Tz → 每轮扭矩                        │
│ τᵢ=[Fx×cosθᵢ+Fy×sinθᵢ-Tz/d×sin(αᵢ-θᵢ)]×R      │
│ + 防单轮超速 + 摩擦力前馈                             │
├─ Step 6: Output_To_Motor ──────────────────────────────┤
│ 舵向: ANGLE模式→目标角度, 轮向: CURRENT→目标电流     │
│ + 功率限制控制 (正功率削减, 负功率回充不补)           │
└────────────────────────────────────────────────────────┘
```

### 7.2 斜坡函数的平滑规划

在 `ita_robot.cpp` 的 `_Chassis_Control()` 中, 目标速度不是直接赋给 PID:

```
摇杆→目标速度 → Class_Slope → 当前规划速度 → PID → 电机
                     ↑
              真实速度(软着陆)
```

**Slope_First_REAL 模式**: 当真实速度已经超过规划速度但未达目标时, 直接跳到真实速度 —— 避免"刹车"式的减速规划。

**核心代码逻辑**:
```cpp
// alg_slope.cpp
void Class_Slope::TIM_Calculate_PeriodElapsedCallback()
{
    if (Slope_First == Slope_First_REAL) {
        // 真实值优先: 如果真实值夹在规划值和目标值之间, 直接取真实值
        if ((Target >= Now_Real && Now_Real >= Now_Planning) ||
            (Target <= Now_Real && Now_Real <= Now_Planning))
            Out = Now_Real;
    }
    // 根据正负方向, 用 Increase_Value 加速, Decrease_Value 减速
    // ...(分支处理正加速/正减速/负加速/负减速/零位加速)
    Now_Planning = Out;
}
```

---

## 8. 功率管理的工程智慧

### 8.1 双层功率限制架构

```
Level 1: 外部功率上限来源
┌─────────────────┐   ┌──────────────┐
│ 超级电容功率PID │   │裁判系统功率上限│
└────────┬────────┘   └──────┬───────┘
         └───────┬───────────┘
                 ↓
        Power_Limit_Max = min(电容上限, 裁判上限)

Level 2: 底盘内部分配
┌───────────────────────────────────┐
│ 总可用功率 = Power_Limit_Max      │
│            + 负功率 (制动回充)     │
│            - 发射功耗             │
│                                   │
│ 舵向优先: min(总可用×0.6, 实际舵向预估功率) │
│ 轮向: 总可用 - 舵向实际消耗        │
│                                   │
│ 功率因数 = min(1.0, 可用/预估)    │
│ 正功率削减, 负功率不削减            │
└───────────────────────────────────┘
```

### 8.2 关键设计决策

1. **负功率不计入限制**: 制动回充能量不占用功率配额
2. **舵轮比 6:4**: 优先保障舵向 (转向) 机动性
3. **零速清积分**: 底盘速度为零时清除所有PID积分, 防止突然启动时的冲击
4. **功率超过严重限制时** (如底盘功率 >70W): 关闭超级电容, 回退到基础功率

### 8.3 超级电容控制策略

```cpp
// ita_robot.cpp _Supercap_Control()
键盘 Q:  开关超级电容
键盘 Shift+C:   加速模式 (提高功率上限)
键盘 Ctrl+W:   爆发模式 (短时极高功率)
能量 < 20:  自动关闭功率辅助
能量 > 55:  自动重新开启
```

---

## 9. 发射机构: 防卡弹与热量管理

### 9.1 控制模式

```cpp
enum Booster_Control_Type {
    Booster_Control_Type_DISABLE,    // 禁用
    Booster_Control_Type_CEASEFIRE,  // 停火
    Booster_Control_Type_SPOT,       // 点射
    Booster_Control_Type_AUTO,       // 连发
};
```

### 9.2 热量分级管理

```
热量值:  0 ─────── 20 ─────── 50 ─────── Max
         │          │           │           │
         正常连发   停火保护    减速射击    完全禁止
                    (黄色)      (橙色)     (红色)
```

在 `crt_booster.cpp` 的 AUTO 模式中:
```cpp
// 热量在 Slowdown 和 Ceasefire 之间 → 线性降低射速
if (Now_Heat > Heat_Limit_Slowdown_Threshold) {
    float ratio = (Now_Heat - Heat_Limit_Slowdown_Threshold) /
                  (Heat_Limit_Ceasefire_Threshold - Heat_Limit_Slowdown_Threshold);
    Shoot_Frequency = Base_Frequency * (1.0f - ratio);
}
```

### 9.3 防卡弹自动处理

防卡弹 FSM 的4态转换 (已在第5.2节详述):
- **触发条件**: 拨弹盘电机扭矩 > 9.5 (任意电流单位)
- **怀疑期**: 500ms 缓冲, 过滤瞬时波动
- **处理**: 反向旋转 30° (约 0.08圈), 持续 300ms
- **恢复**: 回到 NORMAL, 继续正常射击

---

## 10. 云台双环控制与重力前馈

### 10.1 Gimbal Motor 定制的双反馈路径

```cpp
// crt_gimbal_motor.cpp 的核心控制流
void Class_Gimbal_XXX_Motor_DJI_GM6020::PID_Calculate() {
    if (AHRS_Online) {
        // 路径1: AHRS陀螺仪在线 — 用陀螺仪角速度做速度环
        PID_Angle.Set_Target(Target_Angle);
        PID_Angle.Set_Now(Now_Encoder_Angle);
        PID_Angle.TIM_Calculate_PeriodElapsedCallback();
        Target_Omega = PID_Angle.Get_Out();

        PID_AHRS_Omega.Set_Target(Target_Omega);
        PID_AHRS_Omega.Set_Now(AHRS.Omega);
        PID_AHRS_Omega.TIM_Calculate_PeriodElapsedCallback();
        Out = PID_AHRS_Omega.Get_Out();
    } else {
        // 路径2: AHRS掉线 — 降级为编码器微分的角速度环
        PID_Omega.Set_Target(Target_Omega);
        PID_Omega.Set_Now(Now_Omega);  // 编码器微分
        PID_Omega.TIM_Calculate_PeriodElapsedCallback();
        Out = PID_Omega.Get_Out();
    }

    // 重力前馈 (Pitch轴)
    // τ_gravity = K_ff × sin(pitch_angle)
}
```

### 10.2 Yaw 轴的坐标系关联

Yaw 电机需要感知 Pitch 轴的角度才能正确计算绝对指向 (因为 Yaw 轴的旋转轴不总是垂直的), `crt_gimbal_motor` 中 Yaw 电机的构造函数接收 `pitch_motor` 引用。

### 10.3 就近转位 (云台版)

```cpp
void Class_Gimbal::_Motor_Nearest_Transposition() {
    float delta = Math_Modulus_Normalization(target - now, 2*PI);
    // 对 Yaw 轴: 当 Δθ > PI 时, 选择反向360°转位
    if (Math_Abs(delta) > PI) {
        target = target - sign(delta) * 2*PI;
    }
}
```

### 10.4 Pitch 角度限幅

```cpp
Math_Constrain(&Pitch_Angle, -0.60f, +0.33f);  // -34° ~ +19°
```
负向更大的范围允许云台"低头"看更下方, 正向受限保护机构不碰撞。

---

## 11. 姿态感知与坐标变换

### 11.1 三个旋转矩阵

```cpp
// crt_posture.h
Eigen::Matrix3f Matrix_Chassis_Odom_Rotation;   // 底盘→世界
Eigen::Matrix3f Matrix_Gimbal_Chassis_Rotation;  // 云台→底盘
Eigen::Matrix3f Matrix_Gimbal_Odom_Rotation;     // 云台→世界 (合成)
```

### 11.2 关键速度变换

```cpp
// 云台在底盘系的速度
Gimbal_Velocity = Matrix_Gimbal_Chassis_Rotation * Chassis_Velocity;

// 供Manifold视觉模块的弹道补偿数据:
Tx_Data.Velocity_X = Gimbal_Velocity_X;
Tx_Data.Velocity_Y = Gimbal_Velocity_Y;
```

### 11.3 Yaw 角度追踪

云台的绝对 Yaw 角通过差分法计算:
```
Gimbal_Odom_Yaw = AHRS_Raw_Yaw - Encoder_Yaw_Delta + ΔGimbal_Chassis_Yaw
```

这种方法在底盘旋转时 (小陀螺模式) 仍能正确追踪云台的绝对指向。

---

## 12. 视觉追踪的增量式架构

### 12.1 为什么用增量而非绝对角度

**核心设计考量**:
1. **通信丢帧安全**: 丢帧时云台停在原位而非跳到错误位置
2. **累积无漂移**: 增量类型不存在零点漂移问题
3. **离散化天然**: 视觉算法天然以帧为单位输出增量

### 12.2 交互层的自瞄控制流

```cpp
// ita_robot.cpp _Manifold_Control()
if (AutoAim_Enable) {
    // 1. 向视觉发送辅助信息
    Manifold.Set_Tx_Data(Enemy_Color, Aiming_Priority, Velocity_X, Velocity_Y);

    // 2. 接收视觉增量
    Yaw_Angle_Increment = Manifold.Get_Yaw_Angle_Increment();
    Pitch_Angle_Increment = Manifold.Get_Pitch_Angle_Increment();

    // 3. 增量限幅 (防止视觉异常跳变)
    Math_Constrain(&Pitch_Angle_Increment, -PI/6, +PI/6);   // ±30°
    Math_Constrain(&Yaw_Angle_Increment, -PI/3, +PI/3);     // ±60°

    // 4. 角度前馈 (目标运动预测)
    Gimbal.Set_Pitch_Omega_FeedForward(Manifold.Get_Pitch_Omega_FeedForward());

    // 5. 更新云台目标
    Gimbal.Set_Target_Pitch_Angle(current + Pitch_Angle_Increment);
    Gimbal.Set_Target_Yaw_Angle(current + Yaw_Angle_Increment);

    // 6. 自动开火
    if (Manifold.Get_Shoot_Flag() && Confidence > 阈值)
        Booster.Set_Control_Type(AUTO);
}
```

### 12.3 底盘速度前馈 (弹道补偿)

当机器人在移动中射击时, 弹道受底盘速度影响。Manifold 视觉模块利用控制板发送的 **底盘速度** 做弹道解算, 修正射击提前量。

---

## 13. 裁判系统协议解析与UI绘制

### 13.1 协议架构

裁判系统是最复杂的设备驱动 (dvc_referee.h 2928行)。数据包格式:
```
[5字节帧头] [2字节CMD_ID] [2字节长度] [N字节数据] [2字节CRC16]
```

解析流程:
```cpp
void Class_Referee::UART_RxCpltCallback(uint8_t *Rx_Data, uint16_t Length) {
    // 1. 在缓冲区中搜索帧头0xA5 (5字节)
    // 2. 解析CMD_ID和Data_Length
    // 3. CRC16校验
    // 4. 根据CMD_ID分发到对应结构体
    // 5. 更新存活性Flag
}
```

### 13.2 UI 绘制系统

裁判系统支持向操作手客户端发送自定义图形:

```cpp
// 支持的图形类型:
- UI_Graph_Line      // 直线
- UI_Graph_Rectangle // 矩形
- UI_Graph_Circle    // 圆
- UI_Graph_Ellipse   // 椭圆
- UI_Graph_Arc       // 圆弧
- UI_Graph_Float     // 浮点数
- UI_Graph_Int       // 整数
- UI_Graph_String    // 字符串
```

在 `ita_robot.cpp` 中:
- **静态UI** (Init时): 绘制十字准星、功率警告线、热量警告线、状态标签
- **动态UI** (100ms刷新): 功率数值、热量数值、速度矢量、电容能量条、自瞄状态指示

### 13.3 CRC 校验

裁判系统使用 CRC8 和 CRC16:
```cpp
// crc_ref.c — 查表法实现, 预计算256个值的CRC表
const uint8_t CRC8_INIT_TABLE[256] = {...};  // CRC8 多项式 0x07
const uint16_t CRC16_INIT_TABLE[256] = {...}; // CRC16 多项式 0x8005
```

---

## 14. 任务调度: 时间触发架构

### 14.1 无RTOS的确定性调度

项目不使用 FreeRTOS, 而是纯**硬件定时器中断 + 前台主循环**:

```
TIM5 (1ms 中断)
│
├── mod100==0 → Alive_100ms (电机/传感器在线检测)
├── mod1000==0 → Alive_1000ms (陀螺仪校准)
├── mod100==0 → Calculate_100ms (UI绘制, 功率调整)
├── mod10==0 → Calculate_10ms (发射控制, 视觉刷新, 超级电容)
├── mod2==0 → Calculate_2ms (底盘/云台解算+控制)
├── mod1==0 → Calculate_1ms (状态机, 摇杆处理)
│
├── Serialplot 数据发送 (1kHz)
├── CAN 数据发送 (1kHz, CAN2分频2kHz)
└── UART 数据发送 + 喂狗

main() while(1):
    Task_Loop() → robot.Loop() (裁判UI延迟绘制等)
```

### 14.2 软件分频设计

```cpp
// tsk_config_and_callback.cpp
void Task1ms_TIM5_Callback()
{
    static int mod2, mod10, mod100;

    if (++mod100 % 100 == 0) robot.TIM_100ms_Alive_...();
    if (++mod100 % 100 == 0) robot.TIM_100ms_Calculate_...();

    if (++mod10 % 10 == 0)   robot.TIM_10ms_Calculate_...();

    if (++mod2 % 2 == 0)     robot.TIM_2ms_Calculate_...();

    robot.TIM_1ms_Calculate_...();
    // ...
}
```

**优点**: 零上下文切换、完全确定性、无竞态、无优先级反转。

### 14.3 前台循环

```cpp
while (1) {
    Task_Loop();  // → robot.Loop() → Referee UI 延迟绘制
}
```

后台中断处理所有实时任务, 前台只做最低优先级的非实时绘制。

---

## 15. 学到的工程技巧与设计智慧

### 15.1 代码组织

1. **命名前缀体系**: `dvc_`/`drv_`/`alg_`/`crt_`/`ita_`/`tsk_` 六类前缀, 一看文件名就知其职责和层级
2. **Three-Class Object Model** (三类对象模型):
   - **Specialized**: 单例, 自上而下归属 (Chassis/Gimbal/Booster 属于 Robot)
   - **Reusable**: 多例, 各自独立 (每个电机有自己的一套PID/FSM)
   - **Generic**: 共享, 指针传递 (一个AHRS被Posture和Gimbal共同引用)
3. **全局空间管理**: 唯一的全局实例 `robot` 在 `tsk_config_and_callback.cpp` 中定义

### 15.2 防御性编程

1. **初始化完成标志** `init_finished`: 所有中断回调在初始化前不处理数据
2. **存活性检测**: 每隔 100ms 检查各设备 Flag 是否递增, 离线设备进入 fallback 模式
3. **isnormal 检查**: 视觉数据、AHRS数据在输入时检查是否为正规浮点数
4. **多级限幅**: 死区→积分限幅→输出限幅→功率限幅→角度限幅, 层层防护
5. **看门狗**: 独立看门狗 (IWDG) 在 1ms 中断中喂狗

### 15.3 调试支持

1. **串口绘图**: 实时变量可视化, 支持在线调参
2. **裁判系统UI**: 利用官方通路做状态监控
3. **条件编译**: 通过宏开关控制调试输出

### 15.4 数学工具的巧妙封装

1. **`Math_Modulus_Normalization`**: 所有角度计算的标准范化方法, 避免 ±2π 跨越问题
2. **`Math_Constrain`**: 指针传入+返回值返回, 链式调用友好
3. **CMSIS-DSP 集成**: 利用硬件 FPU 加速的 `arm_sin_f32`/`arm_cos_f32`/`arm_sqrt_f32`
4. **Eigen**: 矩阵运算用于姿态解算, 模板展开零开销

### 15.5 运动控制的精髓

1. **运动学与动力学的解耦**: 先解运动学得期望速度, 再通过速度PID得到期望力, 最后解动力学分配为电机扭矩
2. **就近转位**: 简单的几何判断节省大量转向能量
3. **斜坡规划**: 速度的"软着陆"避免轮胎打滑和机械冲击
4. **功率限制的分层优先级**: 不是简单的"所有电机按比例削减", 而是按子系统功能重要性分层

### 15.6 通信的可靠性设计

1. **CAN 掩码滤波器全接收**: 不限制接收ID, 全由软件分发 — 灵活性优先
2. **UART DMA 空闲中断**: 高效接收变长帧
3. **帧头+校验和双重验证**: 每个协议帧都有帧头识别和校验和
4. **通信超时检测**: Flag/Pre_Flag 机制, 外设掉线时自动降级

### 15.7 嵌入式 C++ 的实践智慧

1. **模板的适度使用**: 队列和滤波器用模板, 避免了运行时多态开销
2. **内联 setter/getter**: 简单方法在 .h 中实现, 编译器内联优化
3. **值传递 float**: 嵌入式场景下 float 传值比 const& 更高效 (32位可直接放寄存器)
4. **`__attribute__((packed))`**: 结构体紧凑打包, 直接 memcpy 做协议序列化
5. **避免动态内存**: 全静态/栈分配, 无 malloc/free

---

## 总结

RoboWalker 2024 步兵机器人电控系统是一个**工程教科书级别的嵌入式 C++ 项目**, 在 ~20,000 行代码中展示了:

- **清晰的架构**: 七层单向依赖, 每层职责单一明确
- **扎实的数学**: 舵轮运动学/动力学, FIR 滤波器, Kalman 滤波, 坐标变换矩阵
- **完善的工程**: 功率管理、摩擦力补偿、就近转位、积分清零、重力前馈
- **鲁棒的容错**: 存活性检测、AHRS fallback、角度限幅、看门狗
- **调试友好**: 串口绘图在线调参、裁判UI实时监控

这是一个从 RoboMaster 赛场的真实需求中锤炼出来的系统, 不是"能跑就行"的 demo, 而是"所有边界条件都考虑了"的工业级产品。

---

> **文档版本**: v4-pro
> **分析基于**: 68 个源文件完整阅读
> **版权**: USTC-RoboWalker (c) 2023-2025
